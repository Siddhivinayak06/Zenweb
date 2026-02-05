class ReaderManager {
    constructor(themeManager, speechManager, bionicManager) {
        this.isActive = false;
        this.themeManager = themeManager;
        this.speechManager = speechManager;
        this.bionicManager = bionicManager; // Shared manager
        this.preferredFontSize = 20;
        this.bionicEnabled = false;
    }

    init() {
        chrome.storage.local.get(['fontSize'], (result) => {
            this.preferredFontSize = result.fontSize || 20;
        });
    }

    async enable() {
        if (this.isActive) return;

        // Check if Readability is loaded
        if (typeof Readability === 'undefined') {
            console.log("ZenWeb: Lazy loading Readability.js...");
            try {
                await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage({ action: 'inject_script', file: 'lib/Readability.js' }, (response) => {
                        if (chrome.runtime.lastError || response.error) {
                            reject(response.error || chrome.runtime.lastError.message);
                        } else {
                            resolve();
                        }
                    });
                });
            } catch (e) {
                console.error("ZenWeb: Failed to load Readability.js", e);
                return;
            }
        }

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

        if (this.shortcutHandler) {
            document.removeEventListener('keydown', this.shortcutHandler);
            this.shortcutHandler = null;
        }
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

        // Post-processing: Fix images and protect content
        const contentContainer = overlay.querySelector('.context-aware-reader-content');
        this.postProcessContent(contentContainer);

        // Apply Theme
        this.themeManager.syncOverlayTheme(overlay);

        // Add Reading Time Badge
        const toolbar = overlay.querySelector('.context-aware-reader-toolbar');
        this.injectReadingTimeBadge(toolbar, article.textContent);

        // Apply Bionic Reading if enabled
        chrome.storage.local.get(['bionicReading'], (result) => {
            if (result.bionicReading) {
                this.bionicEnabled = true;
                this.applyBionicReading(contentContainer);
            }
        });


        // Keyboard Shortcuts
        this.shortcutHandler = (e) => {
            if (e.key === 'Escape') {
                this.disable();
                return;
            }
            if (!this.isActive) return; // Safety

            // Only trigger if not typing in an input (unlikely in reader mode, but good practice)
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            switch (e.key) {
                case '+':
                case '=': // Often shares key with +
                    overlay.querySelector('#reader-font-increase').click();
                    break;
                case '-':
                case '_':
                    overlay.querySelector('#reader-font-decrease').click();
                    break;
                case 't':
                case 'T':
                    overlay.querySelector('#reader-theme-toggle').click();
                    break;
                case 's':
                case 'S':
                    overlay.querySelector('#reader-speech-toggle').click();
                    break;
            }
        };
        document.addEventListener('keydown', this.shortcutHandler);

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

    postProcessContent(container) {
        if (!container) return;

        // 1. Fix Lazy Loaded Images
        // Many sites use data-src and require JS to swap it. Readability strips JS.
        const images = container.querySelectorAll('img, picture source');
        images.forEach(img => {
            // Check common lazy load attributes
            const candidates = ['data-src', 'data-original', 'data-url', 'data-srcset', 'srcset'];

            // If it's a source element, we care about srcset
            if (img.tagName === 'SOURCE') {
                if (img.dataset.srcset) img.srcset = img.dataset.srcset;
                return;
            }

            // For IMG tags
            candidates.forEach(attr => {
                if (img.getAttribute(attr)) {
                    // specific handling for srcset
                    if (attr.includes('srcset')) {
                        img.srcset = img.getAttribute(attr);
                    } else {
                        img.src = img.getAttribute(attr);
                    }
                }
            });

            // Ensure they are visible
            img.style.display = 'block';
            img.style.opacity = '1';
            img.style.visibility = 'visible';
            img.loading = 'eager'; // Force load
        });

        // 2. Protect elements from Global "Nuclear" Theme Styles
        // The global styles apply background:transparent to *:not(.context-aware...)
        // We want to exempt Reader content from aggressive stripping to be safe,
        // although mainly we want to ensure they don't look broken.
        // Actually, for Reader Mode, we WANT transparent background on text blocks 
        // so they inherit the Card color. But we might want to keep other styles.
        // For now, removing empty or hidden elements might be good.

        // Let's just create a safe class "zenweb-reader-element" and add it to all children,
        // then specific css can target it if needed, or we just rely on the fact that
        // the global selector excludes [class*="context-aware"]. 
        // Wait, the global selector EXCLUDES context-aware.
        // So if we add "context-aware-safe" to everything, they are PROTECTED from the nuclear option!
        const allElements = container.querySelectorAll('*');
        allElements.forEach(el => {
            el.classList.add('context-aware-reader-child');
        });
    }

    /**
     * Calculate estimated reading time based on word count
     * Average reading speed: 200-250 words per minute
     */
    calculateReadingTime(text) {
        if (!text) return null;
        const words = text.trim().split(/\s+/).length;
        const minutes = Math.ceil(words / 225); // Using 225 WPM as average
        return {
            minutes,
            words,
            label: minutes === 1 ? '1 min read' : `${minutes} min read`
        };
    }

    /**
     * Apply bionic reading formatting to text content via shared manager
     */
    applyBionicReading(container) {
        if (this.bionicManager) {
            this.bionicManager.applyBionicReading(container);
        }
    }

    /**
     * Remove bionic reading formatting via shared manager
     */
    removeBionicReading(container) {
        if (this.bionicManager) {
            this.bionicManager.removeBionicReading(container);
        }
    }

    /**
     * Toggle bionic reading on/off
     */
    setBionicReading(enabled) {
        this.bionicEnabled = enabled;

        const contentContainer = document.querySelector('.context-aware-reader-content');
        if (!contentContainer) return;

        if (enabled) {
            this.applyBionicReading(contentContainer);
        } else {
            this.removeBionicReading(contentContainer);
        }
    }

    /**
     * Inject reading time badge into toolbar
     */
    injectReadingTimeBadge(toolbar, text) {
        const readingTime = this.calculateReadingTime(text);
        if (!readingTime || !toolbar) return;

        // Remove existing badge if any
        const existingBadge = toolbar.querySelector('.reading-time-badge');
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement('span');
        badge.className = 'reading-time-badge';
        badge.innerHTML = `<span class="time-icon">⏱️</span> ${readingTime.label}`;
        badge.title = `${readingTime.words} words`;

        const controls = toolbar.querySelector('.context-aware-reader-controls');
        if (controls) {
            controls.appendChild(badge);
        }
    }
}

