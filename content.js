class ContextAwareController {
    constructor() {
        this.mode = 'none'; // 'none', 'simplify', 'focus'
        this.hiddenElements = [];
        this.modifiedElements = [];
    }

    init() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // console.log('ContextAware received message:', request);
            if (request.action === 'enable_simplify') {
                this.enableSimplify();
                sendResponse({ status: 'Simplify Mode Enabled' });
            } else if (request.action === 'enable_focus') {
                this.enableFocus();
                sendResponse({ status: 'Focus Mode Enabled' });
            } else if (request.action === 'toggle_simplify') {
                this.toggleSimplify();
                sendResponse({ status: 'Toggled Simplify' });
            } else if (request.action === 'toggle_focus') {
                this.toggleFocus();
                sendResponse({ status: 'Toggled Focus' });
            } else if (request.action === 'reset') {
                this.reset();
                sendResponse({ status: 'Reset' });
            } else if (request.action === 'summarize') {
                this.summarizePage().then(summary => {
                    sendResponse({ summary: summary });
                });
                return true; // Indicates async response
            } else if (request.action === 'enable_dyslexia') {
                console.log("ContextAware: Enabling Dyslexia Font");
                document.body.classList.add('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Enabled' });
            } else if (request.action === 'disable_dyslexia') {
                console.log("ContextAware: Disabling Dyslexia Font");
                document.body.classList.remove('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Disabled' });
            } else if (request.action === 'get_status') {
                sendResponse({
                    mode: this.mode,
                    hiddenCount: this.hiddenElements.length,
                    observerActive: !!this.observer
                });
            } else if (request.action.startsWith('set_theme_')) {
                const theme = request.action.replace('set_theme_', '');
                this.updateTheme(theme);
                sendResponse({ status: 'Theme Updated' });
            }
        });

        // Initialize from storage
        chrome.storage.local.get(['theme', 'fontSize'], (result) => {
            if (result.theme) this.updateTheme(result.theme);
            // fontSize is applied when reader mode opens
            this.preferredFontSize = result.fontSize || 20;
        });
    }

    toggleSimplify() {
        if (this.mode === 'simplify') {
            this.reset();
        } else {
            this.enableSimplify();
        }
    }

    toggleFocus() {
        if (this.mode === 'focus') {
            this.reset();
        } else {
            this.enableFocus();
        }
    }

    reset() {
        // Disconnect Observer
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        if (this.mutationTimeout) {
            clearTimeout(this.mutationTimeout);
            this.mutationTimeout = null;
        }

        // Restore hidden elements (Legacy fallback)
        this.hiddenElements.forEach(el => {
            if (el && el.style) {
                el.style.display = el.getAttribute('data-context-aware-original-display') || '';
                el.removeAttribute('data-context-aware-original-display');
            }
        });
        this.hiddenElements = [];

        // Restore modified elements (overflow, classes)
        document.body.classList.remove('context-aware-simplify');
        document.body.classList.remove('context-aware-focus');

        // Remove Reader Overlay
        const overlay = document.querySelector('.context-aware-reader-overlay');
        if (overlay) overlay.remove();

        // Restore Styles
        this.modifiedElements.forEach(item => {
            if (item.element) item.element.style[item.property] = item.original;
        });
        this.modifiedElements = [];

        // Restore focus mode legacy if needed
        document.documentElement.style.overflow = ''; // lazy restore for now

        if (this.escapeListener) {
            document.removeEventListener('keydown', this.escapeListener);
            this.escapeListener = null;
        }

        this.mode = 'none';
    }

    enableSimplify() {
        if (this.mode === 'simplify') return;

        // 1. Initial Check: Is this likely an article?
        let isReaderable = true;
        if (window.isProbablyReaderable) {
            try {
                // Determine if the document is readerable.
                // We use a clone to avoid side effects if isProbablyReaderable modifies logic (usually it doesn't but good practice)
                // However, isProbablyReaderable usually takes the raw document.
                isReaderable = window.isProbablyReaderable(document);
            } catch (e) {
                console.warn("ContextAware: isProbablyReaderable check failed", e);
            }
        }

        // Form override
        const forms = document.querySelectorAll('form');
        if (forms.length === 1 && forms[0].innerText.length > 200) {
            isReaderable = false; // Force legacy for forms
        }

        if (!isReaderable) {
            console.log("ContextAware: Page not suitable for Reader View. Using Legacy Simplify.");
            this.enableLegacySimplify();
            return;
        }

        this.reset(); // clear any previous state
        this.mode = 'simplify';

        try {
            // 2. Parse with Readability
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            // 3. Quality & Portal Check
            // If Readability returns null, content is short, or it looks like a Portal/Homepage
            const isPortal = article.title === article.siteName
                || window.location.pathname === '/'
                || window.location.pathname.includes('/home')
                || window.location.pathname.includes('/index');

            if (!article || !article.content || article.textContent.length < 300 || isPortal) {
                console.warn("ContextAware: Content is portal or poor quality. Using Legacy Simplify.");
                this.enableLegacySimplify();
                return;
            }

            // 4. Create Reader View Overlay
            const overlay = document.createElement('div');
            overlay.className = 'context-aware-reader-overlay context-aware-theme-light'; // Default theme

            // 5. Inject Content with Toolbar
            overlay.innerHTML = `
                <div class="context-aware-reader-toolbar">
                    <div class="context-aware-reader-controls">
                        <button id="reader-theme-toggle" title="Toggle Theme">
                            <span class="icon-theme">🎨</span>
                        </button>
                        <button id="reader-font-decrease" title="Decrease Font">A-</button>
                        <button id="reader-font-increase" title="Increase Font">A+</button>
                    </div>
                    <button class="context-aware-reader-close" aria-label="Close Reader View">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>
                <div class="context-aware-reader-content" style="font-size: ${this.preferredFontSize || 20}px;">
                    <h1>${article.title}</h1>
                    <div class="context-aware-reader-meta">
                        ${article.byline ? `<span>${article.byline}</span>` : ''}
                        ${article.siteName ? `<span>${article.siteName}</span>` : ''}
                    </div>
                    ${article.content}
                </div>
            `;

            document.body.appendChild(overlay);
            document.body.classList.add('context-aware-simplify');
            document.documentElement.style.overflow = 'hidden';
            this.modifiedElements.push({ element: document.documentElement, property: 'overflow', original: '' });

            // Ensure current theme is applied to overlay
            this.syncOverlayTheme(overlay);

            // Events
            const closeBtn = overlay.querySelector('.context-aware-reader-close');
            closeBtn.addEventListener('click', () => this.reset());

            // Theme Toggle
            overlay.querySelector('#reader-theme-toggle').addEventListener('click', () => {
                const themes = ['light', 'sepia', 'dark'];
                // Check current theme on body
                let currentTheme = 'light';
                if (document.body.classList.contains('context-aware-theme-dark')) currentTheme = 'dark';
                else if (document.body.classList.contains('context-aware-theme-sepia')) currentTheme = 'sepia';

                const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];
                this.updateTheme(nextTheme);

                // Save to storage
                chrome.storage.local.set({ theme: nextTheme });
            });

            // Font Size
            const contentDiv = overlay.querySelector('.context-aware-reader-content');
            let fontSize = this.preferredFontSize || 20;

            overlay.querySelector('#reader-font-increase').addEventListener('click', () => {
                if (fontSize < 32) {
                    fontSize += 2;
                    contentDiv.style.fontSize = `${fontSize}px`;
                    this.preferredFontSize = fontSize;
                    chrome.storage.local.set({ fontSize: fontSize });
                }
            });
            overlay.querySelector('#reader-font-decrease').addEventListener('click', () => {
                if (fontSize > 14) {
                    fontSize -= 2;
                    contentDiv.style.fontSize = `${fontSize}px`;
                    this.preferredFontSize = fontSize;
                    chrome.storage.local.set({ fontSize: fontSize });
                }
            });

            this.escapeListener = (e) => { if (e.key === 'Escape') this.reset(); };
            document.addEventListener('keydown', this.escapeListener);

        } catch (e) {
            console.error("ContextAware: Readability error:", e);
        }
    }

    enableFocus() {
        if (this.mode === 'focus') return;
        this.reset();
        this.mode = 'focus';
        document.body.classList.add('context-aware-focus');
    }

    enableLegacySimplify() {
        this.reset();
        this.mode = 'simplify';
        document.body.classList.add('context-aware-simplify');
        this.hideDistractions(document.body);
        this.showToast("Simplify Mode Active");
        this.setupObserver();
    }

    setupObserver() {
        if (this.observer) return;
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        this.mutationTimeout = null;
    }

    handleMutations(mutations) {
        if (this.mutationTimeout) clearTimeout(this.mutationTimeout);
        this.mutationTimeout = setTimeout(() => {
            this.processMutations(mutations);
        }, 500); // 500ms debounce
    }

    processMutations(mutations) {
        if (this.mode === 'simplify') {
            // Re-scan for distractions in the entire body (simplified)
            // Ideally we'd scan only added nodes, but hideDistractions is fast and idempotent-ish
            this.hideDistractions(document.body);
        }
    }

    showToast(message) {
        let toast = document.querySelector('.context-aware-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'context-aware-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Deprecated: hideDistractions was for the old destructive method. 
    // New method overlays content, so distractions are covered.
    hideDistractions(root) {
        // Common selectors for non-content elements
        const selectors = [
            '.ad', '.advertisement', '.social-share', '.share-buttons',
            '.related-posts', '.newsletter-signup', 'aside',
            '[id*="ad-"]', '[class*="ad-"]', 'iframe[src*="ads"]',
            'header', 'nav', 'footer', '#header', '#footer', '.header', '.footer', '.nav',
            '[role="banner"]', '[role="navigation"]', '[role="contentinfo"]'
        ];

        selectors.forEach(selector => {
            const elements = root.querySelectorAll(selector);
            elements.forEach(el => {
                // Skip if already processed by us
                if (el.hasAttribute('data-context-aware-original-display')) return;

                const originalDisplay = el.style.display;
                if (originalDisplay === 'none') return;

                // Only hide if not already processed
                el.setAttribute('data-context-aware-original-display', originalDisplay);
                el.style.display = 'none';
                this.hiddenElements.push(el);
            });
        });
    }

    getLinkDensity(node) {
        const links = node.querySelectorAll('a');
        if (links.length === 0) return 0;

        let linkLength = 0;
        links.forEach(l => linkLength += l.innerText.length);

        const textLength = node.innerText.length;
        if (textLength === 0) return 0;

        return linkLength / textLength;
    }

    findMainContent() {
        // Heuristic: Form detection (High priority for this extension)
        const forms = document.querySelectorAll('form');
        if (forms.length > 0) {
            let bestForm = null;
            let maxInputs = 0;
            forms.forEach(f => {
                // Ignore search bars etc.
                if (f.innerText.length < 50) return;
                const inputs = f.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
                if (inputs > maxInputs && inputs > 2) { // At least 2 inputs to be worth simplifying
                    maxInputs = inputs;
                    bestForm = f;
                }
            });
            if (bestForm) {
                console.log("ContextAware: Identified Form as main content.");
                return bestForm;
            }
        }

        // Heuristic 1: <article> tag
        // Check if it actually contains significant text
        const articles = document.querySelectorAll('article');
        for (let article of articles) {
            if (article.innerText.length > 600) { // Must be substantial
                console.log("ContextAware: Identified <article> tag as main content.");
                return article;
            }
        }

        // Heuristic 2: <main> tag
        const main = document.querySelector('main');
        if (main && main.innerText.length > 600) {
            console.log("ContextAware: Identified <main> tag as main content.");
            return main;
        }

        // Heuristic 3: Element with highest text density / scoring
        const candidates = document.querySelectorAll('div, section, td, article, main');
        let bestCandidate = null;
        let maxScore = 0;

        candidates.forEach(node => {
            // Ignore small nodes (noise)
            if (node.innerText.length < 300) return;

            // Ignore hidden nodes
            if (node.offsetParent === null) return;

            const score = this.scoreNode(node);
            if (score > maxScore) {
                maxScore = score;
                bestCandidate = node;
            }
        });

        if (bestCandidate) {
            console.log("ContextAware: Identified best candidate via scoring:", bestCandidate);
            return bestCandidate;
        }

        console.warn("ContextAware: Could not find specific main content, falling back to body.");
        return document.body;
    }

    scoreNode(node) {
        if (!node) return 0;
        let score = 0;

        // Bonus for class/id names
        const name = (node.className + node.id).toLowerCase();
        if (name.includes('content') || name.includes('main') || name.includes('article') || name.includes('body')) {
            score += 20;
        }
        if (name.includes('sidebar') || name.includes('nav') || name.includes('header') || name.includes('footer') || name.includes('menu')) {
            score -= 20;
        }

        // Text content length (but avoid just huge containers)
        const textLen = node.innerText.length;
        if (textLen > 100) score += Math.min(textLen / 100, 50);

        // Link Density Penalty
        const linkDensity = this.getLinkDensity(node);
        if (linkDensity > 0.4) {
            score -= 50; // Heavily penalize lists of links (menus, footers)
        }

        // Paragraph count
        const pCount = node.querySelectorAll('p').length;
        score += pCount * 5;

        // Input count (good for forms)
        const inputCount = node.querySelectorAll('input, select, textarea').length;
        score += inputCount * 10;

        return score;
    }

    async summarizePage() {
        const mainContent = this.findMainContent();

        // Form Summarization Logic (Keep as is)
        if (mainContent.tagName === 'FORM' || mainContent.querySelector('form')) {
            return this.summarizeForm(mainContent.tagName === 'FORM' ? mainContent : mainContent.querySelector('form'));
        }

        // Article/Text Summarization Logic
        // Use Readability logic to get clean text if possible, otherwise innerText
        let textToSummarize = mainContent.innerText;
        try {
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();
            if (article && article.textContent) {
                textToSummarize = article.textContent;
            }
        } catch (e) {
            console.warn("ContextAware: Readability check failed during summary, using raw text", e);
        }

        return await this.summarizeText(textToSummarize);
    }

    async summarizeText(text) {
        // AI Summarization attempt
        if (window.ai && window.ai.languageModel) {
            try {
                // Check capabilities
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available !== 'no') {
                    const session = await window.ai.languageModel.create();

                    // Truncate text if too long (approx 4000 tokens is safe, ~15k chars. Let's send 10k chars max)
                    const truncatedText = text.substring(0, 10000);
                    const prompt = `Summarize the following article in 3 distinct, concise bullet points (Start each with "• "). Focus on the main ideas:\n\n${truncatedText}`;

                    const result = await session.prompt(prompt);
                    // Parse result into array
                    const points = result.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                    return points;
                }
            } catch (e) {
                console.error("ContextAware: AI Summarization failed, falling back.", e);
            }
        }

        // Fallback: Keyword Frequency Logic
        console.log("ContextAware: Using fallback logic.");
        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
        if (sentences.length <= 3) return sentences.length > 0 ? sentences : ["No significant text content found."];

        const wordCounts = {};
        const words = text.toLowerCase().match(/\w+/g) || [];
        words.forEach(w => {
            if (w.length > 3) {
                wordCounts[w] = (wordCounts[w] || 0) + 1;
            }
        });

        const sentenceScores = sentences.map((s, index) => {
            const sWords = s.toLowerCase().match(/\w+/g) || [];
            let score = 0;
            sWords.forEach(w => {
                if (wordCounts[w]) score += wordCounts[w];
            });
            return { index, text: s.trim(), score: score / (sWords.length || 1) };
        });

        sentenceScores.sort((a, b) => b.score - a.score);

        const top3 = sentenceScores.slice(0, 3).sort((a, b) => a.index - b.index);
        return top3.map(s => s.text);
    }

    updateTheme(theme) {
        // Update Body
        document.body.classList.remove('context-aware-theme-light', 'context-aware-theme-dark', 'context-aware-theme-sepia');
        document.body.classList.add(`context-aware-theme-${theme}`);

        // Update Overlay if it exists
        const overlay = document.querySelector('.context-aware-reader-overlay');
        if (overlay) {
            this.syncOverlayTheme(overlay);
        }
    }

    syncOverlayTheme(overlay) {
        overlay.classList.remove('context-aware-theme-light', 'context-aware-theme-dark', 'context-aware-theme-sepia');
        if (document.body.classList.contains('context-aware-theme-dark')) overlay.classList.add('context-aware-theme-dark');
        else if (document.body.classList.contains('context-aware-theme-sepia')) overlay.classList.add('context-aware-theme-sepia');
        else overlay.classList.add('context-aware-theme-light');
    }
}


const controller = new ContextAwareController();
controller.init();
