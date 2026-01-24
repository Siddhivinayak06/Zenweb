class ReaderManager {
    constructor(themeManager, speechManager) {
        this.isActive = false;
        this.themeManager = themeManager;
        this.speechManager = speechManager;
        this.preferredFontSize = 20;
    }

    init() {
        chrome.storage.local.get(['fontSize'], (result) => {
            this.preferredFontSize = result.fontSize || 20;
        });
    }

    enable() {
        if (this.isActive) return;

        // Detection Strategy:
        // 1. Check URL patterns for known aggregators
        // 2. Check Open Graph type
        // 3. Fallback to Readability strictness

        const isAggregator = this.isAggregatorPage();

        if (isAggregator) {
            console.log("ZenWeb: Detected aggregator. Using Soft Simplify.");
            this.enableSoftMode();
            this.isActive = true;
            return;
        }

        // Clone and Parse for Reader Mode
        const documentClone = document.cloneNode(true);
        let article;
        try {
            article = new Readability(documentClone).parse();
        } catch (e) {
            console.warn("ZenWeb: Readability failed", e);
        }

        // Strictness Check
        if (!article || !article.content || article.textContent.length < 500) {
            console.log("ZenWeb: Content too short for Reader. Trying Soft Mode.");
            this.enableSoftMode();
            this.isActive = true;
            return;
        }

        this.isActive = true;
        this.injectReader(article);
    }

    isAggregatorPage() {
        // Known dashboards/portals
        const hostname = window.location.hostname;
        if (hostname.includes('news.google') ||
            hostname.includes('reddit.com') ||
            hostname.includes('youtube.com')) {
            // Check if it's an article path or root/feed
            const path = window.location.pathname;
            if (hostname.includes('news.google') && path.includes('/articles/')) return false; // Actual article on News? (Usually redirects)
            if (hostname.includes('reddit.com') && path.includes('/comments/')) return false; // Actual thread
            if (hostname.includes('youtube.com') && path.includes('/watch')) return false; // Video page
            return true;
        }

        // Metadata check
        const ogType = document.querySelector('meta[property="og:type"]')?.content;
        if (ogType === 'website' || ogType === 'portal') return true;

        return false;
    }

    enableSoftMode() {
        document.body.classList.add('context-aware-simplify-soft');
        // Floating toolbar removed per user request
    }


    disable() {
        if (!this.isActive) return;
        this.isActive = false;

        document.body.classList.remove('context-aware-simplify');
        document.body.classList.remove('context-aware-simplify-soft'); // Remove soft class
        document.documentElement.style.overflow = '';

        const overlay = document.querySelector('.context-aware-reader-overlay');
        if (overlay) overlay.remove();


        this.speechManager.stop();
    }

    injectReader(article) {
        const overlay = document.createElement('div');
        overlay.className = 'context-aware-reader-overlay';

        overlay.innerHTML = `
            <div class="context-aware-reader-toolbar">
                <div class="context-aware-reader-controls">
                    <button id="reader-theme-toggle" title="Toggle Theme"><span class="icon-theme">🎨</span></button>
                    <button id="reader-font-decrease" title="Decrease Font">A-</button>
                    <button id="reader-font-increase" title="Increase Font">A+</button>
                    <button id="reader-speech-toggle" title="Read Aloud"><span class="icon-speech">🔊</span></button>
                </div>
                <button class="context-aware-reader-close" aria-label="Close">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div class="context-aware-reader-content" style="font-size: ${this.preferredFontSize}px;">
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

        // Apply Theme
        this.themeManager.syncOverlayTheme(overlay);

        // Bind Events
        overlay.querySelector('.context-aware-reader-close').addEventListener('click', () => {
            // We need to signal the main controller to reset, or dispatch a custom event
            document.dispatchEvent(new CustomEvent('zenweb:close-reader'));
        });

        // Theme Toggle
        overlay.querySelector('#reader-theme-toggle').addEventListener('click', () => {
            const themes = ['light', 'sepia', 'dark'];
            const current = this.themeManager.getCurrentTheme();
            const next = themes[(themes.indexOf(current) + 1) % themes.length];

            this.themeManager.updateTheme(next);
            chrome.storage.local.set({ theme: next });
            chrome.runtime.sendMessage({ action: `set_theme_${next}` }); // Sync with popup
        });

        // Font
        const contentDiv = overlay.querySelector('.context-aware-reader-content');
        overlay.querySelector('#reader-font-increase').addEventListener('click', () => {
            if (this.preferredFontSize < 32) {
                this.preferredFontSize += 2;
                contentDiv.style.fontSize = `${this.preferredFontSize}px`;
                chrome.storage.local.set({ fontSize: this.preferredFontSize });
            }
        });
        overlay.querySelector('#reader-font-decrease').addEventListener('click', () => {
            if (this.preferredFontSize > 14) {
                this.preferredFontSize -= 2;
                contentDiv.style.fontSize = `${this.preferredFontSize}px`;
                chrome.storage.local.set({ fontSize: this.preferredFontSize });
            }
        });

        // Speech
        const speechBtn = overlay.querySelector('#reader-speech-toggle');
        const speechIcon = speechBtn.querySelector('.icon-speech');

        speechBtn.addEventListener('click', () => {
            this.speechManager.toggleSpeech(
                contentDiv.innerText,
                () => { speechIcon.textContent = '⏹️'; speechBtn.title = "Stop"; },
                () => { speechIcon.textContent = '🔊'; speechBtn.title = "Read Aloud"; }
            );
        });
    }
}
