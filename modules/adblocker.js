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

            // Iframes often used for ads
            'iframe[src*="doubleclick"]',
            'iframe[src*="googlesyndication"]',
            'iframe[src*="googleadservices"]',
            'iframe[src*="amazon-adsystem"]',
            'iframe[src*="facebook.com/plugins"]',
            'iframe[src*="ad."]',
            'iframe[src*=".ad"]',
            'iframe[id*="google_ads"]',

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

            // Newsletter popups and modals (often intrusive)
            '[class*="newsletter-popup"]',
            '[class*="subscribe-popup"]',
            '[class*="email-popup"]',

            // Cookie consent banners (separate from ads but often annoying)
            // '[class*="cookie-banner"]',
            // '[class*="cookie-consent"]',

            // Sticky ads
            '.sticky-ad',
            '.floating-ad',
            '.fixed-ad',

            // Video ads
            '.video-ad',
            '.preroll-ad',
            '.midroll-ad',

            // Generic sponsored content
            '[class*="promoted"]',
            '[class*="native-ad"]',
            '.sponsored-content',
            '.paid-content',
            '.partner-content'
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
        this.adSelectors.forEach(selector => {
            try {
                document.querySelectorAll(selector).forEach(el => {
                    if (!el.classList.contains('zenweb-ad-hidden')) {
                        el.classList.add('zenweb-ad-hidden');
                        this.hiddenCount++;
                    }
                });
            } catch (e) {
                // Invalid selector, skip
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
            element.classList.add('zenweb-ad-hidden');
            this.hiddenCount++;
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
