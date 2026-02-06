/**
 * ProfileManager - Manages cognitive accessibility profiles for ZenWeb
 */
class ProfileManager {
    constructor() {
        this.activeProfile = null;
        this.customProfile = {};

        this.profiles = {
            adhd: {
                id: 'adhd',
                name: 'ADHD Focus',
                icon: '🎯',
                description: 'Reduces distractions, shorter focus intervals',
                settings: {
                    autoFocus: false,
                    timerDuration: 15,
                    dimIntensity: 0.75,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: true,
                    reduceClutter: true,
                    useBionicReading: true,
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
                    useBionicReading: true,
                    fontSize: 18,
                    lineSpacing: 1.8,
                    letterSpacing: 0.12,
                    wordSpacing: 0.16
                }
            },
            anxiety: {
                id: 'anxiety',
                name: 'Calm Focus',
                icon: '🧘',
                description: 'Reduces stress triggers and simplifies UI',
                settings: {
                    autoFocus: false,
                    timerDuration: 20,
                    dimIntensity: 0.8,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: false,
                    reduceClutter: true,
                    mutedColors: true,
                    reduceContrast: false,
                    fontSize: 16,
                    lineSpacing: 1.6,
                    autoMuteMedia: true
                }
            },
            neuro: {
                id: 'neuro',
                name: 'Fatigue Mode',
                icon: '🧠',
                description: 'High-focus reading suite with Step-by-Step navigation',
                settings: {
                    autoFocus: false,
                    timerDuration: 20,
                    dimIntensity: 0.7,
                    hideAnimations: true,
                    hideAutoplay: true,
                    highlightCurrentParagraph: true,
                    reduceClutter: true,
                    useBionicReading: true,
                    fontSize: 18,
                    lineSpacing: 1.7,
                    stepByStep: true
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
                settings: {}
            }
        };

        this.defaultSettings = {
            autoFocus: false,
            timerDuration: 25,
            dimIntensity: 0.6,
            hideAnimations: false,
            hideAutoplay: false,
            highlightCurrentParagraph: true,
            reduceClutter: false,
            useDyslexiaFont: false,
            useBionicReading: false,
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

    async init() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['activeProfile', 'customProfileSettings'], (result) => {
                if (result.customProfileSettings) {
                    this.profiles.custom.settings = { ...this.defaultSettings, ...result.customProfileSettings };
                } else {
                    this.profiles.custom.settings = { ...this.defaultSettings };
                }
                this.customProfile = this.profiles.custom.settings;
                if (result.activeProfile && this.profiles[result.activeProfile]) {
                    this.activeProfile = result.activeProfile;
                }
                resolve(this.activeProfile);
            });
        });
    }

    getProfiles() { return Object.values(this.profiles); }
    getActiveProfile() { return this.activeProfile ? this.profiles[this.activeProfile] : null; }
    getActiveSettings() {
        const profile = this.getActiveProfile();
        return profile ? profile.settings : this.defaultSettings;
    }

    async setActiveProfile(profileId) {
        if (!this.profiles[profileId]) return false;
        this.activeProfile = profileId;
        return new Promise((resolve) => {
            chrome.storage.sync.set({ activeProfile: profileId }, () => resolve(true));
        });
    }

    async clearActiveProfile() {
        this.activeProfile = null;
        return new Promise((resolve) => {
            chrome.storage.sync.remove('activeProfile', () => resolve(true));
        });
    }

    async updateCustomProfile(settings) {
        this.customProfile = { ...this.defaultSettings, ...settings };
        this.profiles.custom.settings = this.customProfile;
        return new Promise((resolve) => {
            chrome.storage.sync.set({ customProfileSettings: this.customProfile }, () => resolve(true));
        });
    }

    applyProfileToPage() {
        const settings = this.getActiveSettings();
        if (!settings) return;
        const event = new CustomEvent('zenweb:profile-applied', {
            detail: { profileId: this.activeProfile, settings: settings }
        });
        document.dispatchEvent(event);
        this.applyCSSSettings(settings);
        return settings;
    }

    applyCSSSettings(settings) {
        const root = document.documentElement;
        const body = document.body;
        if (settings.fontSize) root.style.setProperty('--zenweb-font-size', `${settings.fontSize}px`);
        if (settings.lineSpacing) root.style.setProperty('--zenweb-line-height', settings.lineSpacing);

        if (settings.useDyslexiaFont) body.classList.add('zenweb-dyslexia-font');
        if (settings.highContrast) body.classList.add('zenweb-high-contrast');
        if (settings.mutedColors) body.classList.add('zenweb-muted-colors');
        if (settings.hideAnimations) body.classList.add('zenweb-no-animations');
        if (settings.boldText) body.classList.add('zenweb-bold-text');
        if (settings.cursorSize === 'large') body.classList.add('zenweb-large-cursor');
    }

    removeProfileCSS() {
        const root = document.documentElement;
        const body = document.body;
        root.style.removeProperty('--zenweb-font-size');
        root.style.removeProperty('--zenweb-line-height');

        // Only remove profile-specific classes that aren't global preferences
        // Actually, easiest is to remove all and then re-sync from storage in the controller
        body.classList.remove('zenweb-dyslexia-font', 'zenweb-high-contrast', 'zenweb-muted-colors', 'zenweb-no-animations', 'zenweb-bold-text', 'zenweb-large-cursor');
    }
}

if (typeof window !== 'undefined') { window.ProfileManager = ProfileManager; }
