/**
 * AdBlocker - Hides advertisement elements from web pages
 * Uses CSS selectors to target common ad patterns
 */
class AdBlocker {
    constructor() {
        this.enabled = false;
        this.hiddenCount = 0;
        this.observer = null;
        this.styleElement = null;
        this.scanInterval = null;
        this.scrollHandler = null;

        // Common advertisement selectors
        this.adSelectors = [
            // Generic ad classes/IDs
            '[class*="ad-"]',
            '[class*="-ad"]',
            '[class*="_ad"]',
            '[class*="ads-"]',
            '[class*="-ads"]',
            '[class*="advertisement"]',
            '[class*="advert"]',
            '[id*="ad-"]',
            '[id*="-ad"]',
            '[id*="_ad"]',
            '[id*="ads-"]',
            '[id*="advertisement"]',
            '[id*="advert"]',
            '[class*="sponsored"]',
            '[id*="sponsored"]',
            '[data-ad]',
            '[data-ads]',
            '[data-ad-slot]',
            '[data-ad-client]',
            '[data-google-query-id]',

            // Google Ads
            'ins.adsbygoogle',
            '.adsbygoogle',
            '[id^="google_ads_"]',
            '[id^="div-gpt-ad"]',
            '.GoogleActiveViewElement',
            'iframe[src*="googleads"]',
            'iframe[src*="googlesyndication"]',
            'iframe[src*="googleadservices"]',
            'iframe[src*="doubleclick"]',

            // Common ad containers
            '.ad-container',
            '.ad-wrapper',
            '.ad-banner',
            '.ad-slot',
            '.ad-unit',
            '.ad-block',
            '.ad-box',
            '.ad-space',
            '.ad-holder',
            '.ad-placement',
            '.ad-label',
            '.ad-leaderboard',
            '.ad-sidebar',
            '.ad-footer',
            '.ad-header',

            // Banners and promos
            '.banner-ad',
            '.top-ad',
            '.bottom-ad',
            '.side-ad',
            '.promo-banner',
            '[class*="banner"]',
            '[class*="promo"]',

            // Iframes often used for ads
            'iframe[src*="amazon-adsystem"]',
            'iframe[src*="facebook.com/plugins"]',
            'iframe[src*="ad."]',
            'iframe[src*=".ad"]',
            'iframe[id*="google_ads"]',
            'iframe[src*="adsense"]',
            'iframe[src*="adserver"]',

            // Social media widgets (often promotional)
            '.fb-ad',
            '.twitter-ad',

            // Specific ad networks
            '[class*="taboola"]',
            '[id*="taboola"]',
            '[class*="outbrain"]',
            '[id*="outbrain"]',
            '[class*="revcontent"]',
            '[class*="mgid"]',
            '[class*="zergnet"]',
            '[class*="colombia"]',
            '[class*="criteo"]',
            '[class*="pubmatic"]',
            '[class*="openx"]',

            // News site specific (Times of India, India Today, etc.)
            '[class*="dfp"]',
            '[id*="dfp"]',
            '[class*="colombia"]',
            '[class*="primis"]',
            '[class*="vidible"]',
            '[data-vidsrc]',
            '.primis-player',
            '.primis-ad',
            '#primis_player',
            '[class*="connatix"]',
            '.jw-ad',
            '.video-ads',

            // Floating/Sticky video players (often autoplay ads)
            '[class*="floating-player"]',
            '[class*="sticky-player"]',
            '[class*="float-video"]',
            '[class*="sticky-video"]',
            '[class*="pip-player"]',
            '.nv-player',
            '.autoplay-video',
            '[class*="nowplaying"]',
            '[class*="now-playing"]',
            '[class*="now_playing"]',
            '[class*="miniPlayer"]',
            '[class*="mini-player"]',
            '[class*="mini_player"]',
            '[class*="playerWrapper"]',
            '[class*="player-wrapper"]',
            '[class*="video-wrapper"]',
            '[class*="videoWrapper"]',
            'div[style*="position: fixed"][style*="bottom"]',
            'div[style*="position:fixed"][style*="bottom"]',
            '[class*="toi-"][class*="player"]',
            '[class*="toi_"][class*="player"]',
            '[id*="player"][style*="fixed"]',
            '[class*="opencollar"]',
            '[class*="open-collar"]',
            '[data-player]',
            '[class*="jw-"]',
            '[class*="jwplayer"]',
            '[id*="jwplayer"]',
            '[class*="vjs-"]',
            '[class*="video-js"]',
            '[class*="brightcove"]',
            '[class*="dailymotion"]',

            // Generic sticky/floating elements
            '[class*="sticky-bottom"]',
            '[class*="fixed-bottom"]',
            '[class*="bottom-sticky"]',
            '[class*="floating-bottom"]',
            'div[class*="bottom"][style*="fixed"]',
            '[class*="floater"]',
            '[class*="docked"]',

            // Newsletter popups and modals (often intrusive)
            '[class*="newsletter-popup"]',
            '[class*="subscribe-popup"]',
            '[class*="email-popup"]',
            '[class*="popup-ad"]',
            '[class*="interstitial"]',

            // Sticky ads
            '.sticky-ad',
            '.floating-ad',
            '.fixed-ad',
            '[class*="adhesion"]',

            // Video ads
            '.video-ad',
            '.preroll-ad',
            '.midroll-ad',
            '.postroll-ad',
            '[class*="video-ad"]',
            '[id*="video-ad"]',
            'video[autoplay]',

            // Generic sponsored content
            '[class*="promoted"]',
            '[class*="native-ad"]',
            '.sponsored-content',
            '.paid-content',
            '.partner-content',
            '[class*="recommendation"]',
            '[class*="related-articles"]',
            '[class*="suggest"]',

            // Overlay ads
            '[class*="overlay-ad"]',
            '[class*="modal-ad"]',
            '[class*="popup"]',
            '[class*="lightbox"]',

            // Common Indian news site patterns
            '.adBox',
            '.advt',
            '#rightbar-ad',
            '.rightbar-ad',
            '.top_ads',
            '.btm_ads',
            '.article-ads',
            '.inline-ad',
            '[class*="adunit"]',
            '[class*="adslot"]',

            // Generic large containers often used for ads
            'aside[class*="ad"]',
            'section[class*="ad"]',
            'div[class*="leaderboard"]',
            'div[class*="skyscraper"]',
            'div[class*="rectangle"]',
            'div[class*="billboard"]',

            // Explore/CTA buttons often promotional
            '[class*="explore-now"]',
            'a[class*="explore"]',
            '.cta-banner'
        ];
    }

    /**
     * Enable ad blocking
     */
    enable() {
        if (this.enabled) return;
        this.enabled = true;

        this.injectStyles();
        this.hideExistingAds();
        this.startObserver();
        this.startPeriodicScan();
        this.startScrollListener();

        console.log('ZenWeb: Ad blocker enabled');
    }

    /**
     * Disable ad blocking
     */
    disable() {
        if (!this.enabled) return;
        this.enabled = false;

        this.removeStyles();
        this.stopObserver();
        this.stopPeriodicScan();
        this.stopScrollListener();
        this.hiddenCount = 0;

        console.log('ZenWeb: Ad blocker disabled');
    }

    /**
     * Toggle ad blocking
     */
    toggle() {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
        return this.enabled;
    }

    /**
     * Pause all animations and media (Pause World)
     */
    pauseAnimations() {
        // 1. Inject CSS to stop CSS animations and transitions
        if (!document.getElementById('zenweb-pause-styles')) {
            const style = document.createElement('style');
            style.id = 'zenweb-pause-styles';
            style.textContent = `
                *, *::before, *::after {
                    animation-play-state: paused !important;
                    transition: none !important;
                }
            `;
            document.head.appendChild(style);
        }

        // 2. Pause all video and audio elements
        document.querySelectorAll('video, audio').forEach(media => {
            if (!media.paused) {
                media.pause();
                media.setAttribute('data-zenweb-paused', 'true');
            }
        });

        console.log('ZenWeb: World Paused ⏸️');
        return true;
    }

    /**
     * Resume animations and media
     */
    resumeAnimations() {
        // 1. Remove CSS
        const style = document.getElementById('zenweb-pause-styles');
        if (style) {
            style.remove();
        }

        // 2. Resume media that WE paused
        document.querySelectorAll('video[data-zenweb-paused="true"], audio[data-zenweb-paused="true"]').forEach(media => {
            media.play().catch(e => console.log('Could not resume media:', e));
            media.removeAttribute('data-zenweb-paused');
        });

        console.log('ZenWeb: World Resumed ▶️');
        return false;
    }

    /**
     * Inject CSS to hide ads
     */
    injectStyles() {
        if (this.styleElement) return;

        this.styleElement = document.createElement('style');
        this.styleElement.id = 'zenweb-adblocker-styles';

        const css = `
            /* ZenWeb Ad Blocker Styles */
            ${this.adSelectors.join(',\n')} {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                height: 0 !important;
                max-height: 0 !important;
                overflow: hidden !important;
                position: absolute !important;
                z-index: -9999 !important;
            }
            
            /* Prevent empty ad spaces */
            .zenweb-ad-hidden {
                display: none !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }
        `;

        this.styleElement.textContent = css;
        document.head.appendChild(this.styleElement);
    }

    /**
     * Remove injected styles
     */
    removeStyles() {
        if (this.styleElement) {
            this.styleElement.remove();
            this.styleElement = null;
        }

        // Remove hidden classes
        document.querySelectorAll('.zenweb-ad-hidden').forEach(el => {
            el.classList.remove('zenweb-ad-hidden');
        });
    }

    /**
     * Hide existing ads on the page
     */
    hideExistingAds() {
        // Hide by selector
        this.adSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    this.forceHideElement(el);
                });
            } catch (e) {
                // Invalid selector, skip
            }
        });

        // Aggressive: Find and hide fixed/sticky elements (bottom, sides)
        this.hideFixedElements();

        // Scan for suspicious sidebar/content ads
        this.hideSuspiciousElements();

        // Hide iframes that look like ads
        this.hideAdIframes();

        // Final cleanup of empty whitespace
        this.collapseEmptyContainers();

        // Expand main content if sidebar is empty
        this.expandMainContent();
    }

    /**
     * Expand main content area if sidebars are empty/hidden
     */
    expandMainContent() {
        try {
            // Selectors for common main content + sidebar layouts
            const mainSelectors = [
                'main', '#main', '.main-content', '#content', '.content-area',
                '.article-body', '.story', '[role="main"]',
                '.wrapper > .left', // Common left/right float pattern
                '.container > .row > .col-md-8' // Bootstrap-like pattern
            ];

            const sidebarSelectors = [
                'aside', '.sidebar', '#sidebar', '.right-rail', '.right-col',
                '.wrapper > .right',
                '.col-md-4'
            ];

            // Helper to check if an element is hidden or empty
            const isHiddenOrEmpty = (el) => {
                if (!el) return true;
                if (el.classList.contains('zenweb-ad-hidden')) return true;
                const style = window.getComputedStyle(el);
                if (style.display === 'none' || style.visibility === 'hidden' || el.offsetHeight === 0) return true;
                // Check if it only contains hidden elements
                const children = Array.from(el.querySelectorAll('*'));
                const hasVisibleContent = children.some(child => {
                    const cs = window.getComputedStyle(child);
                    return cs.display !== 'none' &&
                        cs.visibility !== 'hidden' &&
                        child.offsetHeight > 20 &&
                        !child.classList.contains('zenweb-ad-hidden');
                });
                return !hasVisibleContent;
            };

            // 1. Check strict sidebars
            sidebarSelectors.forEach(sel => {
                document.querySelectorAll(sel).forEach(sidebar => {
                    if (isHiddenOrEmpty(sidebar)) {
                        // Find sibling which is likely main content
                        const parent = sidebar.parentElement;
                        if (parent && parent.children.length >= 2) {
                            Array.from(parent.children).forEach(sibling => {
                                if (sibling !== sidebar && !isHiddenOrEmpty(sibling)) {
                                    // Expand this sibling
                                    sibling.style.width = '100% !important';
                                    sibling.style.maxWidth = '100% !important';
                                    sibling.style.flex = '1 0 100% !important';
                                    sibling.style.marginRight = '0 !important';
                                }
                            });
                        }
                    }
                });
            });

            // 2. Specific check for "TOI"-like layouts (Times of India)
            // They often use fixed pixel widths on the main container
            if (window.innerWidth > 1000) {
                document.querySelectorAll('div[style*="width:"]').forEach(div => {
                    if (div.style.width.includes('px') && parseInt(div.style.width) > 600 && parseInt(div.style.width) < 900) {
                        // Check if it has a right margin or sibling
                        const rect = div.getBoundingClientRect();
                        if (window.innerWidth - rect.right > 300) {
                            // Likely has an empty right rail
                            div.style.width = '100% !important';
                            div.style.maxWidth = '1200px !important'; // Cap it so it's readable
                            div.style.margin = '0 auto !important';
                        }
                    }
                });
            }

        } catch (e) { }
    }

    /**
     * Aggressively collapse empty containers left behind by blocked ads
     */
    collapseEmptyContainers() {
        // Common ad wrapper selectors that might be left empty
        const containerSelectors = [
            '.ad-container', '.ad-slot', '.ad-wrapper', '.ad-box',
            '[id*="ad-"]', '[class*="ad-"]', '[id*="banner"]',
            'div[style*="height"][style*="width"]', // Generic sized divs
            '.top-ad', '.header-ad', '.sidebar-ad'
        ];

        containerSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (el.classList.contains('zenweb-ad-hidden')) return;

                    // formatting: don't touch strict UI elements
                    if (el.closest('#zenweb-sidepanel') || el.closest('.context-aware-reader-overlay')) return;

                    // check if element is effectively empty
                    const hasVisibleChildren = Array.from(el.children).some(child => {
                        const style = window.getComputedStyle(child);
                        return style.display !== 'none' && style.visibility !== 'hidden' && child.offsetHeight > 0;
                    });

                    const hasText = el.textContent.trim().length > 0;

                    // If no visible children and very little text (often just "Advertisement" label remains)
                    if (!hasVisibleChildren && el.textContent.trim().length < 20) {
                        this.forceHideElement(el);
                    }

                    // Also check for specific height containers that are now just whitespace
                    // e.g. a div with height 250px but no visible content
                    if (el.offsetHeight > 0 && !hasVisibleChildren) {
                        // Check if text is just whitespace or "Advertisement"
                        const text = el.textContent.trim().toLowerCase();
                        if (text === '' || text === 'advertisement' || text === 'sponsored') {
                            this.forceHideElement(el);
                        }
                    }
                });
            } catch (e) { }
        });
    }

    /**
     * Force hide an element using inline styles and class
     */
    forceHideElement(el) {
        if (!el || el.classList.contains('zenweb-ad-hidden')) return;
        if (el.closest('.context-aware-reader-overlay')) return; // Don't hide reader content
        if (el.closest('#zenweb-sidepanel')) return; // Don't hide our own UI

        el.classList.add('zenweb-ad-hidden');
        el.style.cssText = 'display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; max-height: 0 !important; overflow: hidden !important; pointer-events: none !important; width: 0 !important; margin: 0 !important; padding: 0 !important;';
        this.hiddenCount++;

        // Also hide parent if it becomes empty or is just a wrapper
        try {
            const parent = el.parentElement;
            if (parent && !parent.classList.contains('zenweb-ad-hidden')) {
                const style = window.getComputedStyle(parent);
                // If parent is a dedicated ad wrapper (often has specific dims or class)
                if (parent.classList.toString().includes('ad') ||
                    parent.id.includes('ad') ||
                    (style.display === 'flex' && parent.children.length === 1) ||
                    (parent.offsetHeight < 10 && parent.offsetHeight > 0)) {

                    this.forceHideElement(parent);
                }
            }

            // Look for siblings that might be loading spinners
            if (parent) {
                const siblings = parent.children;
                for (let i = 0; i < siblings.length; i++) {
                    const sibling = siblings[i];
                    if (sibling === el) continue;

                    // Check for spinner/loader characteristics
                    const sStyle = window.getComputedStyle(sibling);
                    const isSpinner =
                        sibling.classList.toString().includes('loader') ||
                        sibling.classList.toString().includes('spinner') ||
                        sibling.classList.toString().includes('loading') ||
                        (sStyle.borderRadius === '50%' && sStyle.animation !== 'none');

                    if (isSpinner) {
                        this.forceHideElement(sibling);
                    }
                }
            }
        } catch (e) { }
    }

    /**
     * Find and hide suspicious elements based on content and position
     * targeting non-fixed sidebars and banners
     */
    hideSuspiciousElements() {
        // specific text patterns that strongly indicate ads
        const adTextPatterns = [
            'explore now', 'visit site', 'learn more', 'shop now',
            'sponsored', 'advertisement', 'promoted'
        ];

        // Scan potential ad containers
        const containers = document.querySelectorAll('div, aside, section, span, a');
        const viewportWidth = window.innerWidth;

        containers.forEach(el => {
            try {
                // Formatting optimization: skip hidden or tiny elements early
                if (el.offsetParent === null) return;

                const rect = el.getBoundingClientRect();
                if (rect.width < 10 || rect.height < 10) return;

                // Don't touch our UI
                if (el.closest('#zenweb-sidepanel') || el.closest('.context-aware-reader-overlay')) return;

                // 1. Sidebar Skyla (Left/Right) - Tall and narrow
                const isSidebar = (rect.right < 350 || rect.left > viewportWidth - 350);
                const isTall = rect.height > 300 && rect.width < 350;

                if (isSidebar && isTall) {
                    const text = el.textContent?.toLowerCase() || '';
                    const hasAdText = adTextPatterns.some(pattern => text.includes(pattern));
                    const hasIframe = el.querySelector('iframe');

                    if (hasAdText || hasIframe) {
                        this.forceHideElement(el);
                        return;
                    }
                }

                // 2. "EXPLORE NOW" buttons/containers specific check
                // The screenshot showed specifically "EXPLORE NOW"
                if (el.textContent?.toUpperCase().includes('EXPLORE NOW')) {
                    // Check if it's an ad container (checking dimensions to avoid hiding nav buttons)
                    if (rect.height > 50 && rect.width > 50) {
                        this.forceHideElement(el);
                    }
                }
            } catch (e) { }
        });
    }

    /**
     * Find and hide fixed/sticky positioned elements (bottom, sides, top overlay)
     * These are often floating video players, sticky banners, or sidebar ads
     */
    hideFixedElements() {
        const allElements = document.querySelectorAll('*');
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        allElements.forEach(el => {
            try {
                const style = window.getComputedStyle(el);
                const position = style.position;

                // Check if element is fixed or sticky
                if (position === 'fixed' || position === 'sticky') {
                    const rect = el.getBoundingClientRect();

                    // Don't hide our own UI or reader content
                    if (el.closest('.context-aware-reader-overlay') ||
                        el.id?.includes('zenweb') ||
                        el.closest('#zenweb-sidepanel') ||
                        el.classList.contains('context-aware-reader-toolbar')) {
                        return;
                    }

                    // 1. Bottom Floating/Sticky Ads (Video players, sticky footers)
                    if (rect.bottom > viewportHeight - 200 && rect.height > 50 && rect.height < 400) {
                        const hasVideo = el.querySelector('video') || el.querySelector('iframe');
                        const hasAdText = el.textContent?.toLowerCase().includes('ad') ||
                            el.textContent?.toLowerCase().includes('sponsored') ||
                            el.textContent?.toLowerCase().includes('now playing');
                        const looksLikeFloatingPlayer = rect.width < 500 && rect.width > 200;

                        if (hasVideo || hasAdText || looksLikeFloatingPlayer) {
                            this.forceHideElement(el);
                            return;
                        }
                    }

                    // 2. Sidebar Ads (Right side)
                    if (rect.right > viewportWidth - 400 && rect.width > 100 && rect.width < 400) {
                        // Check for common ad indicators
                        const hasAdIndicators = el.querySelector('iframe') ||
                            el.querySelector('a[href*="ad"]') ||
                            el.querySelector('img[src*="ad"]') ||
                            el.classList.toString().toLowerCase().includes('ad') ||
                            el.id.toLowerCase().includes('ad') ||
                            el.textContent?.includes('EXPLORE NOW');

                        // Or if it's very tall and narrow (Skyscraper)
                        const isSkyscraper = rect.height > 400 && rect.width < 320;

                        if (hasAdIndicators || isSkyscraper) {
                            this.forceHideElement(el);
                            return;
                        }
                    }

                    // 3. Sidebar Ads (Left side - like the Zoho one seen)
                    if (rect.right < 400 && rect.width > 100 && rect.width < 400) {
                        const hasAdIndicators = el.querySelector('iframe') ||
                            el.classList.toString().toLowerCase().includes('ad') ||
                            el.textContent?.includes('EXPLORE NOW');

                        const isSkyscraper = rect.height > 400 && rect.width < 320;

                        if (hasAdIndicators || isSkyscraper) {
                            this.forceHideElement(el);
                            return;
                        }
                    }
                }
            } catch (e) {
                // Skip elements that can't be processed
            }
        });
    }

    /**
     * Hide iframes that look like ads
     */
    hideAdIframes() {
        document.querySelectorAll('iframe').forEach(iframe => {
            const src = iframe.src || '';
            const name = iframe.name || '';
            const id = iframe.id || '';

            const isAdIframe =
                src.includes('ad') ||
                src.includes('doubleclick') ||
                src.includes('googlesyndication') ||
                src.includes('amazon-adsystem') ||
                name.includes('ad') ||
                id.includes('ad') ||
                iframe.width === '300' ||
                iframe.width === '728' ||
                iframe.width === '160' ||
                iframe.height === '250' ||
                iframe.height === '600';

            if (isAdIframe) {
                this.forceHideElement(iframe);
            }
        });
    }

    /**
     * Start mutation observer to catch dynamically loaded ads
     */
    startObserver() {
        if (this.observer) return;

        this.observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this.checkAndHideAd(node);
                        // Also check children
                        if (node.querySelectorAll) {
                            this.adSelectors.forEach(selector => {
                                try {
                                    node.querySelectorAll(selector).forEach(el => {
                                        this.checkAndHideAd(el);
                                    });
                                } catch (e) {
                                    // Invalid selector
                                }
                            });
                        }
                    }
                });
            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    /**
     * Stop mutation observer
     */
    stopObserver() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    /**
     * Start periodic scanning for ads (catches lazy-loaded content)
     */
    startPeriodicScan() {
        if (this.scanInterval) return;

        // Scan every 2 seconds for new ads
        this.scanInterval = setInterval(() => {
            if (this.enabled) {
                this.hideExistingAds();
            }
        }, 2000);

        // Also do an immediate scan after short delays to catch initial load
        setTimeout(() => this.hideExistingAds(), 500);
        setTimeout(() => this.hideExistingAds(), 1500);
        setTimeout(() => this.hideExistingAds(), 3000);
    }

    /**
     * Stop periodic scanning
     */
    stopPeriodicScan() {
        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    /**
     * Start scroll listener to detect ads as user scrolls
     */
    startScrollListener() {
        if (this.scrollHandler) return;

        let scrollTimeout;
        this.scrollHandler = () => {
            // Debounce scroll events
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
                if (this.enabled) {
                    this.hideFixedElements();
                    this.hideSuspiciousElements();
                    this.hideAdIframes();
                    this.collapseEmptyContainers();
                    this.expandMainContent();
                }
            }, 100);
        };

        window.addEventListener('scroll', this.scrollHandler, { passive: true });

        // Also listen for resize events (can reveal new ad positions)
        window.addEventListener('resize', this.scrollHandler, { passive: true });
    }

    /**
     * Stop scroll listener
     */
    stopScrollListener() {
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler);
            window.removeEventListener('resize', this.scrollHandler);
            this.scrollHandler = null;
        }
    }

    /**
     * Check if element is an ad and hide it
     */
    checkAndHideAd(element) {
        if (!element || element.classList.contains('zenweb-ad-hidden')) return;

        const isAd = this.adSelectors.some(selector => {
            try {
                return element.matches(selector);
            } catch (e) {
                return false;
            }
        });

        if (isAd) {
            this.forceHideElement(element);
        }
    }

    /**
     * Get count of hidden ads
     */
    getHiddenCount() {
        return this.hiddenCount;
    }

    /**
     * Check if ad blocker is enabled
     */
    isEnabled() {
        return this.enabled;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AdBlocker = AdBlocker;
}
