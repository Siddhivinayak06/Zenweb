/**
 * AutismManager - Sensory-friendly browsing mode for autism spectrum users
 * Provides muted overlay and page freezer functionality
 */
class AutismManager {
    constructor() {
        this.overlayEnabled = false;
        this.freezerEnabled = false;
        this.overlay = null;
        this.scrollHandler = null;
        this.wheelHandler = null;
        this.touchHandler = null;
        this.keyHandler = null;
        this.frozenMedia = [];
        this.frozenGifs = [];
    }

    // ========================================
    // MUTED OVERLAY
    // ========================================

    enableOverlay() {
        if (this.overlayEnabled) return;
        this.overlayEnabled = true;

        if (!this.overlay) {
            this.overlay = document.createElement('div');
            this.overlay.id = 'zenweb-autism-overlay';
            document.body.appendChild(this.overlay);
        }

        // Force reflow for transition
        void this.overlay.offsetHeight;
        this.overlay.classList.add('active');
        console.log('ZenWeb: Autism Overlay Enabled');
    }

    disableOverlay() {
        if (!this.overlayEnabled) return;
        this.overlayEnabled = false;

        if (this.overlay) {
            this.overlay.classList.remove('active');
            // Remove after transition completes (15s fade-out)
            setTimeout(() => {
                if (!this.overlayEnabled && this.overlay) {
                    this.overlay.remove();
                    this.overlay = null;
                }
            }, 15500);
        }
        console.log('ZenWeb: Autism Overlay Disabled');
    }

    toggleOverlay() {
        if (this.overlayEnabled) {
            this.disableOverlay();
        } else {
            this.enableOverlay();
        }
        return this.overlayEnabled;
    }

    isOverlayEnabled() {
        return this.overlayEnabled;
    }

    // ========================================
    // PAGE FREEZER
    // ========================================

    enableFreezer() {
        if (this.freezerEnabled) return;
        this.freezerEnabled = true;

        // Stop all media
        this.stopAllMedia();

        // Freeze GIFs
        this.freezeGifs();

        // Disable scrolling
        this.disableScrolling();

        console.log('ZenWeb: Page Freezer Enabled');
    }

    disableFreezer() {
        if (!this.freezerEnabled) return;
        this.freezerEnabled = false;

        // Resume media (optional - keep muted for comfort)
        this.resumeMedia();

        // Restore GIFs
        this.restoreGifs();

        // Enable scrolling
        this.enableScrolling();

        console.log('ZenWeb: Page Freezer Disabled');
    }

    toggleFreezer() {
        if (this.freezerEnabled) {
            this.disableFreezer();
        } else {
            this.enableFreezer();
        }
        return this.freezerEnabled;
    }

    isFreezerEnabled() {
        return this.freezerEnabled;
    }

    // ========================================
    // MEDIA CONTROL
    // ========================================

    stopAllMedia() {
        // Stop videos
        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
            if (!video.paused) {
                this.frozenMedia.push({ element: video, wasPlaying: true });
                video.pause();
                video.muted = true;
            }
        });

        // Stop audio
        const audios = document.querySelectorAll('audio');
        audios.forEach(audio => {
            if (!audio.paused) {
                this.frozenMedia.push({ element: audio, wasPlaying: true });
                audio.pause();
                audio.muted = true;
            }
        });
    }

    resumeMedia() {
        // Just unmute - don't auto-resume for sensory comfort
        this.frozenMedia.forEach(item => {
            item.element.muted = false;
        });
        this.frozenMedia = [];
    }

    // ========================================
    // GIF FREEZING
    // ========================================

    freezeGifs() {
        const gifs = document.querySelectorAll('img[src*=".gif"]');
        gifs.forEach(gif => {
            try {
                // Create canvas with first frame
                const canvas = document.createElement('canvas');
                canvas.width = gif.naturalWidth || gif.width || 100;
                canvas.height = gif.naturalHeight || gif.height || 100;

                const ctx = canvas.getContext('2d');

                // Attempt to draw (may fail with CORS)
                try {
                    ctx.drawImage(gif, 0, 0, canvas.width, canvas.height);

                    // Store original src and replace with canvas data
                    this.frozenGifs.push({
                        element: gif,
                        originalSrc: gif.src,
                        originalStyle: gif.style.cssText
                    });

                    gif.src = canvas.toDataURL('image/png');
                    gif.dataset.zenwebFrozen = 'true';
                } catch (corsError) {
                    // CORS/tainting error - fallback to opacity reduction
                    console.log('ZenWeb: GIF CORS error, using fallback');
                    this.frozenGifs.push({
                        element: gif,
                        originalSrc: gif.src,
                        originalStyle: gif.style.cssText,
                        fallback: true
                    });
                    gif.style.opacity = '0.3';
                    gif.style.filter = 'grayscale(100%)';
                    gif.dataset.zenwebFrozen = 'true';
                }
            } catch (e) {
                console.log('ZenWeb: Error freezing GIF', e);
            }
        });
    }

    restoreGifs() {
        this.frozenGifs.forEach(item => {
            if (item.fallback) {
                // Restore fallback style
                item.element.style.cssText = item.originalStyle;
            } else {
                // Restore original src
                item.element.src = item.originalSrc;
            }
            delete item.element.dataset.zenwebFrozen;
        });
        this.frozenGifs = [];
    }

    // ========================================
    // SCROLL BLOCKING
    // ========================================

    disableScrolling() {
        // Lock body overflow
        document.body.classList.add('zenweb-autism-frozen');
        document.documentElement.classList.add('zenweb-autism-frozen');

        // Block wheel events
        this.wheelHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };
        window.addEventListener('wheel', this.wheelHandler, { capture: true, passive: false });

        // Block touch scroll
        this.touchHandler = (e) => {
            if (e.touches.length > 0) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('touchmove', this.touchHandler, { capture: true, passive: false });

        // Block scroll event
        this.scrollHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.scrollTo(0, 0);
        };
        window.addEventListener('scroll', this.scrollHandler, { capture: true, passive: false });

        // Block keyboard scroll keys
        this.keyHandler = (e) => {
            const scrollKeys = [
                'Space', 'PageUp', 'PageDown', 'End', 'Home',
                'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'
            ];
            if (scrollKeys.includes(e.code)) {
                e.preventDefault();
                e.stopPropagation();
            }
        };
        window.addEventListener('keydown', this.keyHandler, { capture: true });
    }

    enableScrolling() {
        // Unlock body overflow
        document.body.classList.remove('zenweb-autism-frozen');
        document.documentElement.classList.remove('zenweb-autism-frozen');

        // Remove event listeners
        if (this.wheelHandler) {
            window.removeEventListener('wheel', this.wheelHandler, { capture: true });
            this.wheelHandler = null;
        }
        if (this.touchHandler) {
            window.removeEventListener('touchmove', this.touchHandler, { capture: true });
            this.touchHandler = null;
        }
        if (this.scrollHandler) {
            window.removeEventListener('scroll', this.scrollHandler, { capture: true });
            this.scrollHandler = null;
        }
        if (this.keyHandler) {
            window.removeEventListener('keydown', this.keyHandler, { capture: true });
            this.keyHandler = null;
        }
    }

    // ========================================
    // FULL MODE CONTROL
    // ========================================

    enable() {
        this.enableOverlay();
        this.enableFreezer();
    }

    disable() {
        this.disableOverlay();
        this.disableFreezer();
    }
}

if (typeof window !== 'undefined') {
    window.AutismManager = AutismManager;
}
