/**
 * ProfileManager - Manages cognitive accessibility profiles for ZenWeb
 * Provides predefined profiles for ADHD, Dyslexia, Low Vision, and Sensory Sensitivity
 * Plus custom profile support with full personalization
 */
class ProfileManager {
    constructor() {
        this.activeProfile = null;
        this.customProfile = {};

        // Predefined cognitive profiles with evidence-based settings
        this.profiles = {
            adhd: {
                id: 'adhd',
                name: 'ADHD Focus',
                icon: '🎯',
                description: 'Reduces distractions, shorter focus intervals',
                settings: {
                    autoFocus: false,
                    timerDuration: 15, // Shorter intervals work better for ADHD
                    dimIntensity: 0.75,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: true,
                    reduceClutter: true,
                    fontSize: 16,
                    lineSpacing: 1.6
                }
            },
            dyslexia: {
                id: 'dyslexia',
                name: 'Dyslexia Friendly',
                icon: '📖',
                description: 'Optimized fonts and spacing for easier reading',
                settings: {
                    autoFocus: false,
                    timerDuration: 25,
                    dimIntensity: 0.5,
                    hideAnimations: false,
                    hideAutoplay: false,
                    highlightCurrentParagraph: true,
                    reduceClutter: false,
                    useDyslexiaFont: true,
                    fontSize: 18,
                    lineSpacing: 1.8,
                    letterSpacing: 0.12,
                    wordSpacing: 0.16
                }
            },
            lowVision: {
                id: 'lowVision',
                name: 'Low Vision',
                icon: '👁️',
                description: 'High contrast, larger text and UI elements',
                settings: {
                    autoFocus: false,
                    timerDuration: 25,
                    dimIntensity: 0.3,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: true,
                    reduceClutter: true,
                    highContrast: true,
                    fontSize: 22,
                    lineSpacing: 1.7,
                    cursorSize: 'large',
                    boldText: true
                }
            },
            sensory: {
                id: 'sensory',
                name: 'Sensory Calm',
                icon: '🔇',
                description: 'Minimal stimulation, muted colors',
                settings: {
                    autoFocus: false,
                    timerDuration: 20,
                    dimIntensity: 0.85,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: false,
                    reduceClutter: true,
                    mutedColors: true,
                    reduceContrast: true,
                    fontSize: 16,
                    lineSpacing: 1.5,
                    autoMuteMedia: true
                }
            },
            custom: {
                id: 'custom',
                name: 'Custom Profile',
                icon: '⚙️',
                description: 'Your personalized settings',
                settings: {} // Loaded from storage
            }
        };

        // Default settings template for custom profile
        this.defaultSettings = {
            autoFocus: false,
            timerDuration: 25,
            dimIntensity: 0.6,
            hideAnimations: false,
            hideAutoplay: false,
            highlightCurrentParagraph: true,
            reduceClutter: false,
            useDyslexiaFont: false,
            highContrast: false,
            mutedColors: false,
            fontSize: 16,
            lineSpacing: 1.5,
            letterSpacing: 0,
            wordSpacing: 0,
            cursorSize: 'default',
            boldText: false,
            autoMuteMedia: false
        };
    }

    /**
     * Initialize the ProfileManager - load saved profile from storage
     */
    async init() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['activeProfile', 'customProfileSettings'], (result) => {
                // Load custom profile settings if they exist
                if (result.customProfileSettings) {
                    this.profiles.custom.settings = {
                        ...this.defaultSettings,
                        ...result.customProfileSettings
                    };
                    this.customProfile = this.profiles.custom.settings;
                } else {
                    this.profiles.custom.settings = { ...this.defaultSettings };
                    this.customProfile = this.profiles.custom.settings;
                }

                // Set active profile
                if (result.activeProfile && this.profiles[result.activeProfile]) {
                    this.activeProfile = result.activeProfile;
                }

                resolve(this.activeProfile);
            });
        });
    }

    /**
     * Get all available profiles
     */
    getProfiles() {
        return Object.values(this.profiles);
    }

    /**
     * Get the currently active profile
     */
    getActiveProfile() {
        if (!this.activeProfile) return null;
        return this.profiles[this.activeProfile];
    }

    /**
     * Get settings for the active profile
     */
    getActiveSettings() {
        const profile = this.getActiveProfile();
        return profile ? profile.settings : this.defaultSettings;
    }

    /**
     * Set the active profile and persist to storage
     */
    async setActiveProfile(profileId) {
        if (!this.profiles[profileId]) {
            console.error(`ZenWeb: Unknown profile ${profileId}`);
            return false;
        }

        this.activeProfile = profileId;

        return new Promise((resolve) => {
            chrome.storage.sync.set({ activeProfile: profileId }, () => {
                console.log(`ZenWeb: Profile set to ${profileId}`);
                resolve(true);
            });
        });
    }

    /**
     * Clear the active profile
     */
    async clearActiveProfile() {
        this.activeProfile = null;

        return new Promise((resolve) => {
            chrome.storage.sync.remove('activeProfile', () => {
                resolve(true);
            });
        });
    }

    /**
     * Update custom profile settings
     */
    async updateCustomProfile(settings) {
        this.customProfile = {
            ...this.defaultSettings,
            ...settings
        };
        this.profiles.custom.settings = this.customProfile;

        return new Promise((resolve) => {
            chrome.storage.sync.set({ customProfileSettings: this.customProfile }, () => {
                console.log('ZenWeb: Custom profile updated');
                resolve(true);
            });
        });
    }

    /**
     * Get custom profile settings
     */
    getCustomProfileSettings() {
        return this.customProfile;
    }

    /**
     * Apply profile settings to the page
     * This triggers the appropriate managers to update their state
     */
    applyProfileToPage() {
        const settings = this.getActiveSettings();
        if (!settings) return;

        // Dispatch event for other managers to listen to
        const event = new CustomEvent('zenweb:profile-applied', {
            detail: {
                profileId: this.activeProfile,
                settings: settings
            }
        });
        document.dispatchEvent(event);

        // Apply CSS-based settings directly
        this.applyCSSSettings(settings);

        return settings;
    }

    /**
     * Apply CSS-based settings to document
     */
    applyCSSSettings(settings) {
        const root = document.documentElement;
        const body = document.body;

        // Font size
        if (settings.fontSize) {
            root.style.setProperty('--zenweb-font-size', `${settings.fontSize}px`);
        }

        // Line spacing
        if (settings.lineSpacing) {
            root.style.setProperty('--zenweb-line-height', settings.lineSpacing);
        }

        // Letter spacing
        if (settings.letterSpacing) {
            root.style.setProperty('--zenweb-letter-spacing', `${settings.letterSpacing}em`);
        }

        // Word spacing
        if (settings.wordSpacing) {
            root.style.setProperty('--zenweb-word-spacing', `${settings.wordSpacing}em`);
        }

        // Dyslexia font toggle
        if (settings.useDyslexiaFont) {
            body.classList.add('zenweb-dyslexia-font');
        } else {
            body.classList.remove('zenweb-dyslexia-font');
        }

        // High contrast
        if (settings.highContrast) {
            body.classList.add('zenweb-high-contrast');
        } else {
            body.classList.remove('zenweb-high-contrast');
        }

        // Muted colors
        if (settings.mutedColors) {
            body.classList.add('zenweb-muted-colors');
        } else {
            body.classList.remove('zenweb-muted-colors');
        }

        // Hide animations
        if (settings.hideAnimations) {
            body.classList.add('zenweb-no-animations');
        } else {
            body.classList.remove('zenweb-no-animations');
        }

        // Bold text
        if (settings.boldText) {
            body.classList.add('zenweb-bold-text');
        } else {
            body.classList.remove('zenweb-bold-text');
        }

        // Large cursor
        if (settings.cursorSize === 'large') {
            body.classList.add('zenweb-large-cursor');
        } else {
            body.classList.remove('zenweb-large-cursor');
        }
    }

    /**
     * Remove all profile CSS settings
     */
    removeProfileCSS() {
        const root = document.documentElement;
        const body = document.body;

        root.style.removeProperty('--zenweb-font-size');
        root.style.removeProperty('--zenweb-line-height');
        root.style.removeProperty('--zenweb-letter-spacing');
        root.style.removeProperty('--zenweb-word-spacing');

        body.classList.remove(
            'zenweb-dyslexia-font',
            'zenweb-high-contrast',
            'zenweb-muted-colors',
            'zenweb-no-animations',
            'zenweb-bold-text',
            'zenweb-large-cursor'
        );
    }
}

// Export for use in content script
if (typeof window !== 'undefined') {
    window.ProfileManager = ProfileManager;
}
