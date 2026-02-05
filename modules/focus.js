class FocusManager {
    constructor(themeManager) {
        this.isActive = false;
        this.timerInterval = null;
        this.timeLeft = 25 * 60; // 25 minutes
        this.timerRunning = false;
        this.themeManager = themeManager;
        this.lineFocusMode = 'normal'; // 'normal' (3 lines) or 'narrow' (1 line)
        this.currentScale = 100; // Percentage
        this.articleContainer = null; // Cached article container from Readability
        this.readabilityLoaded = false;
        // Site-specific content selectors for various news websites
        this.siteSelectors = {
            // Times of India
            'timesofindia.indiatimes.com': {
                articleContainers: ['._s30J', '.js_tbl_article', '.Normal', '.ga-headlines'],
                textElements: ['div._s30J > div', '._s30J p', '.Normal']
            },
            // Hindustan Times - .storyBody is on body tag, use .artContent instead
            'hindustantimes.com': {
                articleContainers: ['.artContent', '.articleDetail', '.storyDetailContent', '.detail-content'],
                textElements: ['.artContent p', '.articleDetail p', '.artContent .content', 'p.content']
            },
            // Indian Express
            'indianexpress.com': {
                articleContainers: ['.story-details', '.story-content', '.o-story-content'],
                textElements: ['.story-details p', '.story-content p']
            },
            // NDTV
            'ndtv.com': {
                articleContainers: ['.sp-cn', '.story__content', '.content_text'],
                textElements: ['.sp-cn p', '.story__content p', '.content_text p']
            },
            // The Hindu  
            'thehindu.com': {
                articleContainers: ['.article-content', '.articlebodycontent'],
                textElements: ['.article-content p', '.articlebodycontent p']
            },
            // Economic Times
            'economictimes.indiatimes.com': {
                articleContainers: ['.artText', '.article_content'],
                textElements: ['.artText p', '.article_content p']
            },
            // News18
            'news18.com': {
                articleContainers: ['.story-content', '#article_body'],
                textElements: ['.story-content p', '#article_body p']
            },
            // DNA India
            'dnaindia.com': {
                articleContainers: ['.article-content', '.content-body'],
                textElements: ['.article-content p', '.content-body p']
            }
        };
    }

    async enable() {
        if (this.isActive) return;
        this.isActive = true;
        document.body.classList.add('context-aware-focus');
        window.focus(); // Force focus to main window to capture keys

        // Try to find article container using Readability (same as Simplify Mode)
        await this.findArticleContainer();

        this.injectTimer();
        this.enableVisualAids();
        this.dispatchToast("Focus Mode Active. Click page if keys don't work.");
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.articleContainer = null; // Clear cached container
        document.body.classList.remove('context-aware-focus');
        this.removeTimer();
        this.disableVisualAids();
    }

    enableVisualAids() {
        // Reading Guide
        this.readingGuide = document.createElement('div');
        this.readingGuide.className = 'zenweb-reading-guide';
        document.body.appendChild(this.readingGuide);

        this.mouseMoveHandler = (e) => {
            this.readingGuide.style.top = `${e.clientY}px`;

            // Paragraph Highlighting
            this.handleParagraphHighlight(e.target);
        };

        document.addEventListener('mousemove', this.mouseMoveHandler);

        this.keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                this.disable();
            } else if (this.isActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                // Debug feedback
                // this.dispatchToast(`Navigating ${e.key}`);
                this.navigateFocus(e.key === 'ArrowDown' ? 1 : -1);
            }
        };
        document.addEventListener('keydown', this.keyDownHandler);
    }

    disableVisualAids() {
        if (this.readingGuide) this.readingGuide.remove();
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
            this.keyDownHandler = null;
        }

        // Clear any active highlights
        const highlighted = document.querySelectorAll('.focus-mode-highlight');
        highlighted.forEach(el => el.classList.remove('focus-mode-highlight'));
    }

    handleParagraphHighlight(target) {
        // Find the best candidate first (semantic tag or explicit image)
        let p = target.closest('p, li, h1, h2, h3, h4, blockquote, pre, figure');

        // Check for explicit image target
        if (target.tagName === 'IMG' || target.tagName === 'PICTURE') {
            if (this.isValidTarget(target)) {
                p = target;
            }
        }

        // Fallback: Check for generic text containers
        if (!p && ['DIV', 'SPAN', 'ARTICLE', 'SECTION', 'MAIN'].includes(target.tagName)) {
            if (this.isValidTarget(target)) {
                p = target;
            }
        }

        // Final validation of the candidate "p"
        if (p && !this.isValidTarget(p)) {
            p = null;
        }

        // Remove previous highlight if detained
        const current = document.querySelector('.focus-mode-highlight');
        if (current && current !== p) {
            current.classList.remove('focus-mode-highlight');
        }

        if (p) {
            p.classList.add('focus-mode-highlight');
            // Apply current scale
            if (this.currentScale !== 100) {
                p.style.fontSize = `${this.currentScale}%`;
                p.style.lineHeight = '1.6';
            }
        }
    }

    isValidTarget(node) {
        if (!node) return false;
        if (node.offsetParent === null) return false; // Hidden

        const rect = node.getBoundingClientRect();
        const tagName = node.tagName;

        // 1. Explicit Image Check
        if (tagName === 'IMG' || tagName === 'PICTURE') {
            return (rect.width > 200 && rect.height > 100);
        }

        // 2. Size Check (General)
        // Too small to be meaningful content?
        if (rect.width < 60 && rect.height < 60) return false;

        // Too big? (Page wrapper)
        if (rect.height > window.innerHeight * 0.8 || rect.width > window.innerWidth * 0.9) return false;

        // 3. List Item Specifics (Social Icons)
        if (tagName === 'LI') {
            // Square-ish and small usually means icon button
            if (rect.width < 100 && rect.height < 100 && Math.abs(rect.width - rect.height) < 20) {
                if (node.innerText.trim().length < 4) return false;
            }
        }

        // 4. Text Content Check
        // Does it have enough text to be worth reading?
        // Semantic tags get a pass with less text, generic divs need more.
        const textLen = node.innerText.trim().length;
        if (['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'LI'].includes(tagName)) {
            return textLen > 0;
        }

        // For generic containers, ensure significant direct text
        if (['DIV', 'SPAN', 'ARTICLE', 'SECTION', 'MAIN'].includes(tagName)) {
            let hasDirectText = false;
            for (let child of node.childNodes) {
                if (child.nodeType === 3 && child.textContent.trim().length > 20) {
                    hasDirectText = true;
                    break;
                }
            }
            return hasDirectText;
        }

        // Default allow for other explicitly handled tags like FIGURE/PRE if size checks pass
        return true;
    }

    navigateFocus(direction) {
        // 1 for next, -1 for previous
        const current = document.querySelector('.focus-mode-highlight');
        const elements = this.getNavigableElements();

        console.log(`ZenWeb Nav: Found ${elements.length} elements. Current:`, current);

        if (elements.length === 0) {
            this.dispatchToast("No readable text found on this page.");
            return;
        }

        let index = -1;
        if (current) {
            index = elements.indexOf(current);
        }

        let nextIndex = index + direction;

        // Bounds check
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= elements.length) nextIndex = elements.length - 1;

        const target = elements[nextIndex];

        if (target && target !== current) {
            this.handleParagraphHighlight(target);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Update reading guide position
            if (this.readingGuide) {
                const rect = target.getBoundingClientRect();
                // We need the Y position relative to viewport, but scrollIntoView will move it.
                // Best to wait a tick or estimate based on block: center
                // Actually, since scroll is smooth, immediate retrieval might be wrong.
                // But for the guide overlay, we can just center it on screen since we centered the block.
                this.readingGuide.style.top = `50vh`;
            }
        }
    }

    getNavigableElements() {
        // Priority 0: If Simplify Mode reader overlay exists, navigate within it
        const readerOverlay = document.querySelector('.context-aware-reader-overlay');
        if (readerOverlay) {
            const candidates = new Set();
            const selector = 'p, li, h1, h2, h3, h4, blockquote, pre';
            const nodes = readerOverlay.querySelectorAll(selector);

            nodes.forEach(node => {
                const textLen = node.innerText?.trim().length || 0;
                if (textLen > 20 && node.offsetParent !== null) {
                    candidates.add(node);
                }
            });

            if (candidates.size > 0) {
                console.log(`ZenWeb Focus: Found ${candidates.size} elements in Reader overlay`);
                return Array.from(candidates);
            }
        }

        // Priority 1: Use Readability-detected article container (same as Simplify Mode)
        if (this.articleContainer) {
            const candidates = new Set();
            const selector = 'p, li, h1, h2, h3, h4, blockquote, pre';
            const nodes = this.articleContainer.querySelectorAll(selector);

            nodes.forEach(node => {
                if (this.isValidTargetForSite(node)) {
                    candidates.add(node);
                }
            });

            if (candidates.size > 0) {
                console.log(`ZenWeb Focus: Found ${candidates.size} elements in Readability container`);
                return Array.from(candidates);
            }
        }

        // Priority 2: Site-specific selectors
        const candidates = new Set();
        const hostname = window.location.hostname;
        let siteConfig = null;

        for (const site in this.siteSelectors) {
            if (hostname.includes(site)) {
                siteConfig = this.siteSelectors[site];
                break;
            }
        }

        if (siteConfig) {
            siteConfig.textElements.forEach(selector => {
                try {
                    const nodes = document.querySelectorAll(selector);
                    nodes.forEach(node => {
                        if (this.isValidTargetForSite(node)) {
                            candidates.add(node);
                        }
                    });
                } catch (e) {
                    console.log('ZenWeb: Invalid selector', selector);
                }
            });

            siteConfig.articleContainers.forEach(containerSelector => {
                try {
                    const containers = document.querySelectorAll(containerSelector);
                    containers.forEach(container => {
                        const textBlocks = container.querySelectorAll('p, div, span');
                        textBlocks.forEach(node => {
                            if (this.isValidTargetForSite(node)) {
                                candidates.add(node);
                            }
                        });
                    });
                } catch (e) {
                    console.log('ZenWeb: Invalid container selector', containerSelector);
                }
            });

            if (candidates.size > 0) {
                console.log(`ZenWeb Focus: Found ${candidates.size} elements via site-specific selectors`);
                return Array.from(candidates);
            }
        }

        // Priority 3: Standard fallback
        const selector = 'p, li, h1, h2, h3, h4, blockquote, pre, div, article, section, span, img, figure, picture';
        const nodes = document.querySelectorAll(selector);

        nodes.forEach(node => {
            if (this.isValidTarget(node)) {
                candidates.add(node);
            }
        });

        return Array.from(candidates);
    }

    async findArticleContainer() {
        // Use Readability to find the same content that Simplify Mode uses
        if (typeof Readability === 'undefined') {
            console.log('ZenWeb Focus: Lazy loading Readability.js...');
            try {
                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: 'inject_script', file: 'lib/Readability.js' }, (response) => {
                        if (chrome.runtime.lastError || response?.error) {
                            reject(response?.error || chrome.runtime.lastError?.message);
                        } else {
                            resolve();
                        }
                    });
                });
                this.readabilityLoaded = true;
            } catch (e) {
                console.warn('ZenWeb Focus: Failed to load Readability.js', e);
                return null;
            }
        }

        try {
            // Clone and parse document
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();

            if (!article || !article.content || article.textContent.length < 300) {
                console.log('ZenWeb Focus: Readability found insufficient content');
                return null;
            }

            // Find the original container in the DOM by matching article title or content
            // Strategy: Find an element that contains most of the article text
            const articleTitle = article.title;
            const articleTextSample = article.textContent.substring(0, 200);

            // Try to find container by looking for elements with matching content
            const candidates = document.querySelectorAll('article, main, [role="main"], .article, .content, .post, .story, .artContent, .articleDetail, ._s30J');

            for (const candidate of candidates) {
                const text = candidate.innerText || '';
                // Check if this container has significant overlap with the article
                if (text.length > 300 && text.includes(articleTextSample.substring(0, 50))) {
                    console.log('ZenWeb Focus: Found article container via Readability match');
                    this.articleContainer = candidate;
                    return candidate;
                }
            }

            // Fallback: Look for the element with the most paragraph content
            const allContainers = document.querySelectorAll('div, article, section, main');
            let bestMatch = null;
            let bestScore = 0;

            for (const container of allContainers) {
                const paragraphs = container.querySelectorAll('p');
                const textLen = container.innerText?.length || 0;
                const score = paragraphs.length * 100 + textLen;

                // Must have meaningful content and not be the body/html
                if (paragraphs.length >= 3 && textLen > 500 && textLen < 50000 && score > bestScore) {
                    if (container.tagName !== 'BODY' && container.tagName !== 'HTML') {
                        bestScore = score;
                        bestMatch = container;
                    }
                }
            }

            if (bestMatch) {
                console.log('ZenWeb Focus: Found article container via content analysis');
                this.articleContainer = bestMatch;
                return bestMatch;
            }

        } catch (e) {
            console.warn('ZenWeb Focus: Error finding article container', e);
        }

        return null;
    }

    isValidTargetForSite(node) {
        // Less strict validation for site-specific elements
        if (!node) return false;
        if (node.offsetParent === null) return false; // Hidden

        const rect = node.getBoundingClientRect();
        const textLen = node.innerText?.trim().length || 0;

        // Must have meaningful text
        if (textLen < 30) return false;

        // Basic size checks
        if (rect.width < 60 || rect.height < 20) return false;

        // Too big = likely a container, not a readable block
        if (rect.height > window.innerHeight * 0.6) return false;

        // Check if this node has mostly text or mostly child elements
        // If mostly children with text, it's probably a container
        const childTextNodes = Array.from(node.childNodes).filter(
            child => child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0
        );

        // Has meaningful direct text or is a small enough element
        const hasDirectText = childTextNodes.some(t => t.textContent.trim().length > 20);
        const isSmallEnough = rect.height < 200;

        return hasDirectText || (isSmallEnough && textLen > 30);
    }

    async injectTimer() {
        if (document.getElementById('zenweb-focus-timer')) return;

        // Check if Reader Mode toolbar exists - if so, inject Focus controls there
        const readerToolbar = document.querySelector('.context-aware-reader-toolbar .context-aware-reader-controls');

        if (readerToolbar) {
            // Insert Focus controls into the existing Reader toolbar
            const focusControls = document.createElement('div');
            focusControls.id = 'zenweb-focus-timer';
            focusControls.className = 'zenweb-focus-inline-controls';
            focusControls.innerHTML = `
                <span class="toolbar-divider"></span>
                <div class="timer-display">--:--</div>
                <button id="timer-toggle" title="Start/Pause">▶</button>
                <button class="text-size-btn" id="btn-text-inc" title="Increase Text Size">A+</button>
                <button class="text-size-btn" id="btn-text-dec" title="Decrease Text Size">A-</button>
                <button class="text-size-btn line-focus-btn" id="btn-line-focus" title="Toggle Line Focus Height">≡</button>
                <button data-time="25" class="timer-preset">Focus</button>
                <button data-time="5" class="timer-preset">Break</button>
            `;
            readerToolbar.appendChild(focusControls);

            await this.bindTimerEvents(focusControls);
            return;
        }

        // Standalone Focus Mode timer (when Simplify is not active)
        const timer = document.createElement('div');
        timer.id = 'zenweb-focus-timer';
        timer.className = 'zenweb-timer-widget';
        timer.innerHTML = `
            <div class="timer-display">--:--</div>
            <div class="timer-controls">
                <button id="timer-toggle" title="Start/Pause">▶</button>
                <button id="timer-reset" title="Reset">↺</button>
            </div>
            <div class="timer-extra-controls">
                <button class="text-size-btn" id="btn-text-inc" title="Increase Text Size">A+</button>
                <button class="text-size-btn" id="btn-text-dec" title="Decrease Text Size">A-</button>
                <button class="text-size-btn line-focus-btn" id="btn-line-focus" title="Toggle Line Focus Height">≡</button>
            </div>
            <div class="timer-presets">
                <button data-time="25">Focus</button>
                <button data-time="5">Break</button>
            </div>
        `;
        document.body.appendChild(timer);

        await this.bindTimerEvents(timer);
    }

    async bindTimerEvents(container) {
        // Bind timer toggle and reset
        const toggleBtn = container.querySelector('#timer-toggle');
        const resetBtn = container.querySelector('#timer-reset');

        if (toggleBtn) toggleBtn.addEventListener('click', () => this.toggleTimer());
        if (resetBtn) resetBtn.addEventListener('click', () => this.resetTimer());

        // Bind preset buttons (both formats)
        const presets = container.querySelectorAll('[data-time]');
        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                const mins = parseInt(btn.dataset.time);
                this.setTimerDuration(mins);
            });
        });

        // Extra Controls
        const textInc = container.querySelector('#btn-text-inc');
        const textDec = container.querySelector('#btn-text-dec');
        const lineFocus = container.querySelector('#btn-line-focus');

        if (textInc) textInc.addEventListener('click', () => this.adjustTextSize(10));
        if (textDec) textDec.addEventListener('click', () => this.adjustTextSize(-10));
        if (lineFocus) lineFocus.addEventListener('click', () => this.toggleLineFocus());

        // Initialize state from storage
        const state = await this.getTimerState();
        if (state.isRunning) {
            this.startTicker();
        }
        this.updateTimerUI(state);
    }

    removeTimer() {
        const timer = document.getElementById('zenweb-focus-timer');
        if (timer) timer.remove();
        this.stopTicker();
    }

    async getTimerState() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['focusTimer'], (result) => {
                const now = Date.now();
                const data = result.focusTimer || {
                    isRunning: false,
                    endTime: null,
                    remaining: 25 * 60,
                    lastUpdated: now
                };

                // If running, recalculate remaining
                if (data.isRunning && data.endTime) {
                    const remaining = Math.max(0, Math.ceil((data.endTime - now) / 1000));
                    if (remaining === 0) {
                        data.isRunning = false; // Expired
                        data.remaining = 0;
                        this.saveTimerState(data); // Sync expiration
                    } else {
                        data.remaining = remaining;
                    }
                }

                resolve(data);
            });
        });
    }

    saveTimerState(state) {
        chrome.storage.local.set({ focusTimer: state });
        this.updateTimerUI(state);
    }

    async setTimerDuration(minutes) {
        const state = {
            isRunning: false,
            endTime: null,
            remaining: minutes * 60,
            lastUpdated: Date.now()
        };
        this.saveTimerState(state);
        this.stopTicker(); // Stop any running ticker
    }

    async toggleTimer() {
        let state = await this.getTimerState();
        if (state.isRunning) {
            // Pause
            state.isRunning = false;
            state.endTime = null; // Clear end time
            this.stopTicker();
        } else {
            // Start
            if (state.remaining <= 0) state.remaining = 25 * 60; // Reset if 0
            state.isRunning = true;
            state.endTime = Date.now() + (state.remaining * 1000);
            this.startTicker();
        }
        this.saveTimerState(state);
    }

    async resetTimer() {
        this.stopTicker();
        // Default to last known duration or 25 mins? Let's reset to 25.
        const state = {
            isRunning: false,
            endTime: null,
            remaining: 25 * 60,
            lastUpdated: Date.now()
        };
        this.saveTimerState(state);
    }

    startTicker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(async () => {
            const state = await this.getTimerState(); // Fetch fresh to stay synced? Or just local logic?
            // Optimization: Just calc local based on known EndTime if running
            // But we need to check if another tab paused it.
            // For now, let's trust the checking logic in getTimerState handles the time calc.

            if (!state.isRunning) {
                this.stopTicker();
                return;
            }

            this.updateTimerUI(state);

            if (state.remaining <= 0) {
                this.stopTicker();
                this.timerEnded();
            }
        }, 1000);
    }

    stopTicker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    updateTimerUI(state) {
        if (!state) return;

        const timerDisplay = document.querySelector('#zenweb-focus-timer .timer-display');
        const toggleBtn = document.querySelector('#zenweb-focus-timer #timer-toggle');

        if (timerDisplay) {
            const m = Math.floor(state.remaining / 60).toString().padStart(2, '0');
            const s = (state.remaining % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }

        if (toggleBtn) {
            toggleBtn.textContent = state.isRunning ? '⏸' : '▶';
        }
    }

    timerEnded() {
        // Simple alert or notification
        alert("Focus Session Complete! Take a break.");
        this.resetTimer();
    }

    adjustTextSize(delta) {
        this.currentScale += delta;
        if (this.currentScale < 80) this.currentScale = 80;
        if (this.currentScale > 200) this.currentScale = 200;

        const highlighted = document.querySelector('.focus-mode-highlight');
        if (highlighted) {
            highlighted.style.fontSize = `${this.currentScale}%`;
            highlighted.style.lineHeight = '1.6'; // Ensure readability
        }

        // Also apply to body specifically for context-aware-focus so newly highlighted elements inherit if needed
        // But per paragraph is better. Let's just store it and apply on hover.
    }

    toggleLineFocus() {
        this.lineFocusMode = this.lineFocusMode === 'normal' ? 'narrow' : 'normal';
        if (this.readingGuide) {
            const height = this.lineFocusMode === 'normal' ? '48px' : '24px';
            this.readingGuide.style.height = height;
        }
    }

    dispatchToast(msg) {
        document.dispatchEvent(new CustomEvent('zenweb:toast', { detail: { message: msg } }));
    }
}
