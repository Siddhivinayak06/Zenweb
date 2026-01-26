class ContextAwareController {
    constructor() {
        this.mode = 'none'; // 'none', 'simplify', 'focus'

        // Initialize Modules
        this.profileManager = new ProfileManager();
        this.cognitiveScorer = new CognitiveLoadScorer();
        this.analyticsManager = new AnalyticsManager();
        this.adBlocker = new AdBlocker();
        this.themeManager = new ThemeManager();
        this.speechManager = new SpeechManager();
        this.aiManager = new AIManager();
        this.readerManager = new ReaderManager(this.themeManager, this.speechManager);
        this.focusManager = new FocusManager(this.themeManager);
    }

    async init() {
        // Initialize modules
        await this.profileManager.init();
        await this.analyticsManager.init();

        this.themeManager.init();
        this.readerManager.init();

        // Load and apply ad blocker preference
        chrome.storage.local.get(['adBlockerEnabled'], (result) => {
            // Enable by default if not set
            if (result.adBlockerEnabled !== false) {
                this.adBlocker.enable();
            }
        });

        // Apply active profile on page load
        const activeProfile = this.profileManager.getActiveProfile();
        if (activeProfile) {
            this.profileManager.applyProfileToPage();
            this.updateFocusManagerFromProfile();
        }

        // Load Global Preferences
        chrome.storage.local.get(['dyslexiaFont'], (result) => {
            if (result.dyslexiaFont) {
                document.body.classList.add('context-aware-dyslexia-font');
            }
        });

        // Calculate initial cognitive score after page loads
        setTimeout(() => this.calculateAndStoreCognitiveScore(), 2000);

        // Listen for profile changes
        document.addEventListener('zenweb:profile-applied', (e) => {
            this.updateFocusManagerFromProfile();
            this.analyticsManager.trackProfileUsage(e.detail.profileId);
        });

        // Listen for internal events
        document.addEventListener('zenweb:close-reader', () => this.reset());
        document.addEventListener('zenweb:toast', (e) => this.showToast(e.detail.message));

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'enable_simplify') {
                this.enableSimplify();
                this.showToast('Simplify Mode Enabled');
                sendResponse({ status: 'Simplify Mode Enabled' });
            } else if (request.action === 'enable_focus') {
                this.enableFocus();
                this.showToast('Focus Mode Enabled');
                sendResponse({ status: 'Focus Mode Enabled' });
            } else if (request.action === 'toggle_simplify') {
                this.toggleSimplify();
                this.showToast(this.mode === 'simplify' ? 'Simplify Mode On' : 'Simplify Mode Off');
                sendResponse({ status: 'Toggled Simplify' });
            } else if (request.action === 'toggle_focus') {
                this.toggleFocus();
                this.showToast(this.mode === 'focus' ? 'Focus Mode On' : 'Focus Mode Off');
                sendResponse({ status: 'Toggled Focus' });
            } else if (request.action === 'reset') {
                this.reset();
                sendResponse({ status: 'Reset' });
            } else if (request.action === 'summarize') {
                this.analyticsManager.trackAIUsage('summary');
                this.aiManager.summarizePage().then(summary => {
                    sendResponse({ summary: summary });
                });
                return true; // Async
            } else if (request.action === 'enable_dyslexia') {
                document.body.classList.add('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Enabled' });
            } else if (request.action === 'disable_dyslexia') {
                document.body.classList.remove('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Disabled' });
            } else if (request.action === 'get_status') {
                const lastScore = this.cognitiveScorer.getLastScore();
                sendResponse({
                    mode: this.mode,
                    activeProfile: this.profileManager.activeProfile,
                    cognitiveScore: lastScore ? lastScore.score : null,
                    cognitiveLevel: lastScore ? lastScore.level : null,
                    hiddenCount: 0,
                    observerActive: this.mode !== 'none'
                });
            } else if (request.action.startsWith('set_theme_')) {
                sendResponse({ status: 'Theme Updated' });
            } else if (request.action === 'get_page_content') {
                const content = document.body.innerText || '';
                sendResponse({ content: content.substring(0, 20000) });
            } else if (request.action === 'set_profile') {
                this.setProfile(request.profileId).then(() => {
                    sendResponse({ status: 'Profile Set', profileId: request.profileId });
                });
                return true; // Async
            } else if (request.action === 'clear_profile') {
                this.clearProfile().then(() => {
                    sendResponse({ status: 'Profile Cleared' });
                });
                return true; // Async
            } else if (request.action === 'get_profiles') {
                sendResponse({
                    profiles: this.profileManager.getProfiles(),
                    activeProfile: this.profileManager.activeProfile
                });
            } else if (request.action === 'update_custom_profile') {
                this.profileManager.updateCustomProfile(request.settings).then(() => {
                    if (this.profileManager.activeProfile === 'custom') {
                        this.profileManager.applyProfileToPage();
                    }
                    sendResponse({ status: 'Custom Profile Updated' });
                });
                return true; // Async
            } else if (request.action === 'get_cognitive_score') {
                // Return cached score or calculate new one
                this.getCognitiveScore().then(score => {
                    sendResponse(score);
                });
                return true; // Async
            } else if (request.action === 'recalculate_cognitive_score') {
                // Force recalculation
                this.cognitiveScorer.clearCache();
                this.getCognitiveScore().then(score => {
                    sendResponse(score);
                });
                return true; // Async
            } else if (request.action === 'chat_with_page') {
                this.analyticsManager.trackAIUsage('chat');
                // Let background handle this, but track it
                sendResponse({ status: 'tracked' });
            } else if (request.action === 'toggle_adblocker') {
                const isEnabled = this.adBlocker.toggle();
                chrome.storage.local.set({ adBlockerEnabled: isEnabled });
                this.showToast(isEnabled ? '🚫 Ads Hidden' : 'Ad Blocker Off');
                sendResponse({
                    enabled: isEnabled,
                    hiddenCount: this.adBlocker.getHiddenCount()
                });
            } else if (request.action === 'enable_adblocker') {
                this.adBlocker.enable();
                chrome.storage.local.set({ adBlockerEnabled: true });
                sendResponse({
                    enabled: true,
                    hiddenCount: this.adBlocker.getHiddenCount()
                });
            } else if (request.action === 'disable_adblocker') {
                this.adBlocker.disable();
                chrome.storage.local.set({ adBlockerEnabled: false });
                sendResponse({ enabled: false, hiddenCount: 0 });
            } else if (request.action === 'get_adblocker_status') {
                sendResponse({
                    enabled: this.adBlocker.isEnabled(),
                    hiddenCount: this.adBlocker.getHiddenCount()
                });
            }
        });
    }

    async calculateAndStoreCognitiveScore() {
        try {
            const score = await this.cognitiveScorer.scorePage();
            this.analyticsManager.trackCognitiveScore(score.score, score.level.level);
            return score;
        } catch (e) {
            console.error('ZenWeb: Failed to calculate cognitive score', e);
            return null;
        }
    }

    async getCognitiveScore() {
        const lastScore = this.cognitiveScorer.getLastScore();
        if (lastScore) {
            return lastScore;
        }
        return await this.calculateAndStoreCognitiveScore();
    }

    async setProfile(profileId) {
        await this.profileManager.setActiveProfile(profileId);
        this.profileManager.applyProfileToPage();
        this.updateFocusManagerFromProfile();

        const profile = this.profileManager.getActiveProfile();
        if (profile) {
            document.body.setAttribute('data-zenweb-profile', profile.name);
            this.showToast(`${profile.icon} ${profile.name} Active`);
            this.analyticsManager.trackProfileUsage(profileId);

            // Auto-enable focus mode for profiles that have it
            if (profile.settings.autoFocus && this.mode !== 'focus') {
                this.enableFocus();
            }
        }
    }

    async clearProfile() {
        await this.profileManager.clearActiveProfile();
        this.profileManager.removeProfileCSS();
        document.body.removeAttribute('data-zenweb-profile');
        this.showToast('Profile Cleared');
    }

    updateFocusManagerFromProfile() {
        const settings = this.profileManager.getActiveSettings();
        if (!settings) return;

        // Update Focus Manager timer duration based on profile
        if (settings.timerDuration && this.focusManager) {
            this.focusManager.timeLeft = settings.timerDuration * 60;
        }
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
        this.readerManager.disable();
        this.focusManager.disable();
        this.speechManager.stop();
        this.mode = 'none';

        // Remove legacy classes just in case
        document.body.classList.remove('context-aware-simplify', 'context-aware-focus');
    }

    enableSimplify() {
        if (this.mode === 'simplify') return;
        this.reset(); // Clear other modes
        this.mode = 'simplify';
        this.readerManager.enable();
        this.analyticsManager.trackModeActivation('simplify');
    }

    enableFocus() {
        if (this.mode === 'focus') return;
        this.reset();
        this.mode = 'focus';
        this.focusManager.enable();
        this.analyticsManager.trackModeActivation('focus');
    }

    showToast(message) {
        let toast = document.querySelector('.zenweb-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'zenweb-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');

        if (this.toastTimeout) clearTimeout(this.toastTimeout);
        this.toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }
}

const controller = new ContextAwareController();
controller.init();

