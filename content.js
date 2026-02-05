// Note: AuthManager is removed from here as it is centralized in Background Script.
// We communicate with background for auth checks.

class ContextAwareController {
    constructor() {
        // Support both modes simultaneously
        this.simplifyActive = false;
        this.focusActive = false;
        // Initialize Modules
        this.profileManager = new ProfileManager();
        this.cognitiveScorer = new CognitiveLoadScorer();
        this.analyticsManager = new AnalyticsManager();
        this.adBlocker = new AdBlocker();
        this.themeManager = new ThemeManager();
        this.speechManager = new SpeechManager();
        this.aiManager = new AIManager();
        this.bionicManager = new BionicManager();
        this.formWizard = new FormWizard();
        this.readerManager = new ReaderManager(this.themeManager, this.speechManager, this.bionicManager);
        this.focusManager = new FocusManager(this.themeManager);

        // Upsell Manager (Freemium)
        this.checkForComplexForms();
    }

    // ... checkForComplexForms ... (Kept as is, not shown for brevity in replacement but assumed present if I match correctly)
    // Actually replace only changed parts if possible, but class structure makes it hard.

    checkForComplexForms() {
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
            if (inputs.length > 8) {
                this.showContextualUpsell(form);
            }
        });
    }

    showContextualUpsell(form) {
        if (form.dataset.zenwebUpsell) return;
        form.dataset.zenwebUpsell = 'true';

        const banner = document.createElement('div');
        banner.className = 'zenweb-upsell-banner';
        banner.innerHTML = `
            <div class="upsell-content">
                <span class="upsell-icon">✨</span>
                <div class="upsell-text">
                    <strong>Complex Form Detected</strong>
                    <span>Switch to Wizard Mode for step-by-step guidance.</span>
                </div>
                <button class="upsell-btn">Try Free</button>
                <button class="upsell-close">×</button>
            </div>
        `;

        form.style.position = 'relative';
        banner.style.position = 'absolute';
        banner.style.top = '-60px';
        banner.style.left = '0';
        banner.style.width = '100%';
        banner.style.zIndex = '1000';
        form.insertBefore(banner, form.firstChild);

        banner.querySelector('.upsell-close').addEventListener('click', (e) => {
            e.preventDefault();
            banner.remove();
        });

        banner.querySelector('.upsell-btn').innerText = 'Start Wizard ✨';
        banner.querySelector('.upsell-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.formWizard.start(form);
            banner.remove();
        });
    }

    async init() {
        // Initialize modules
        // Auth is now managed by Background
        await this.profileManager.init();
        await this.analyticsManager.init();

        this.themeManager.init();
        this.readerManager.init();

        // Load and apply ad blocker preference
        chrome.storage.local.get(['adBlockerEnabled'], (result) => {
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

        chrome.storage.local.get(['dyslexiaFont'], (result) => {
            if (result.dyslexiaFont) {
                document.body.classList.add('context-aware-dyslexia-font');
            }
        });

        setTimeout(() => this.calculateAndStoreCognitiveScore(), 2000);

        document.addEventListener('zenweb:profile-applied', (e) => {
            this.updateFocusManagerFromProfile();
            this.analyticsManager.trackProfileUsage(e.detail.profileId);
        });

        document.addEventListener('zenweb:close-reader', () => this.reset());
        document.addEventListener('zenweb:toast', (e) => this.showToast(e.detail.message));

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            // AUTH HANDLERS REMOVED (Handled by Background)

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
            } else if (request.action === 'toggle_pause') {
                const isPaused = document.getElementById('zenweb-pause-styles');
                if (isPaused) {
                    this.adBlocker.resumeAnimations();
                    this.showToast('World Resumed ▶️');
                    sendResponse({ paused: false });
                } else {
                    this.adBlocker.pauseAnimations();
                    this.showToast('World Paused ⏸️');
                    sendResponse({ paused: true });
                }
            } else if (request.action === 'reset') {
                this.reset();
                sendResponse({ status: 'Reset' });
            } else if (request.action === 'summarize') {
                // Rate Limit Check via Background
                chrome.runtime.sendMessage({ action: 'check_usage_limit', feature: 'ai_summary' }, (limitCheck) => {
                    if (!limitCheck.allowed) {
                        sendResponse({ limitReached: true, limit: limitCheck.limit });
                        return;
                    }

                    this.analyticsManager.trackAIUsage('summary');
                    this.aiManager.summarizePage().then(summary => {
                        // Track usage after success
                        chrome.runtime.sendMessage({ action: 'track_usage', feature: 'ai_summary' });

                        // We need user status to calculate remaining
                        chrome.runtime.sendMessage({ action: 'get_user_status' }, (user) => {
                            const remaining = user && user.plan === 'free' ? (limitCheck.limit - (limitCheck.current + 1)) : 'Unlimited';
                            sendResponse({ summary: summary, remaining: remaining });
                        });
                    });
                });
                return true; // Async
            } else if (request.action === 'extract_actions') {
                // Check Pro Status via Background
                chrome.runtime.sendMessage({ action: 'get_user_status' }, (user) => {
                    if (!user || user.plan !== 'pro') {
                        sendResponse({ error: 'Upgrade to Pro to use this feature.' });
                        return;
                    }
                    this.analyticsManager.trackAIUsage('action_items');
                    const text = request.text || document.body.innerText;
                    this.aiManager.extractActionItems(text).then(actions => {
                        sendResponse({ actions: actions });
                    });
                });
                return true; // Async
            } else if (request.action === 'enable_dyslexia') {
                document.body.classList.add('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Enabled' });
            } else if (request.action === 'disable_dyslexia') {
                document.body.classList.remove('context-aware-dyslexia-font');
                sendResponse({ status: 'Dyslexia Mode Disabled' });
            } else if (request.action === 'enable_bionic') {
                this.bionicManager.enable();
                this.readerManager.setBionicReading(true);
                this.showToast('Bionic Reading Enabled');
                sendResponse({ status: 'Bionic Reading Enabled' });
            } else if (request.action === 'disable_bionic') {
                this.bionicManager.disable();
                this.readerManager.setBionicReading(false);
                this.showToast('Bionic Reading Disabled');
                sendResponse({ status: 'Bionic Reading Disabled' });
            } else if (request.action === 'get_status') {
                const lastScore = this.cognitiveScorer.getLastScore();
                // Get User Status from Background? Or just send local data?
                // get_status is often used for popup init which is fast.
                // We'll skip user in this response for now as sidepanel fetches it separately via 'get_user_status'
                sendResponse({
                    mode: this.getCurrentMode(),
                    simplifyActive: this.simplifyActive,
                    focusActive: this.focusActive,
                    activeProfile: this.profileManager.activeProfile,
                    cognitiveScore: lastScore ? lastScore.score : null,
                    cognitiveLevel: lastScore ? lastScore.level : null,
                    hiddenCount: 0,
                    observerActive: this.simplifyActive || this.focusActive
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
                return true;
            } else if (request.action === 'clear_profile') {
                this.clearProfile().then(() => {
                    sendResponse({ status: 'Profile Cleared' });
                });
                return true;
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
                return true;
            } else if (request.action === 'get_cognitive_score') {
                this.getCognitiveScore().then(score => {
                    sendResponse(score);
                });
                return true;
            } else if (request.action === 'recalculate_cognitive_score') {
                this.cognitiveScorer.clearCache();
                this.getCognitiveScore().then(score => {
                    sendResponse(score);
                });
                return true;
            } else if (request.action === 'chat_with_page') {
                this.analyticsManager.trackAIUsage('chat');
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

        if (settings.timerDuration && this.focusManager) {
            this.focusManager.timeLeft = settings.timerDuration * 60;
        }

        if (settings.dimIntensity) {
            document.documentElement.style.setProperty('--zenweb-focus-opacity', settings.dimIntensity);
        } else {
            document.documentElement.style.removeProperty('--zenweb-focus-opacity');
        }

        if (settings.reduceClutter) {
            this.adBlocker.enable();
        }
    }

    toggleSimplify() {
        if (this.simplifyActive) {
            this.disableSimplify();
        } else {
            this.enableSimplify();
        }
    }

    toggleFocus() {
        if (this.focusActive) {
            this.disableFocus();
        } else {
            this.enableFocus();
        }
    }

    reset() {
        this.disableSimplify();
        this.disableFocus();
        this.speechManager.stop();
        document.body.classList.remove('context-aware-simplify', 'context-aware-focus');
    }

    getCurrentMode() {
        if (this.simplifyActive && this.focusActive) return 'both';
        if (this.simplifyActive) return 'simplify';
        if (this.focusActive) return 'focus';
        return 'none';
    }

    enableSimplify() {
        if (this.simplifyActive) return;
        this.simplifyActive = true;
        this.readerManager.enable();
        this.analyticsManager.trackModeActivation('simplify');
    }

    disableSimplify() {
        if (!this.simplifyActive) return;
        this.simplifyActive = false;
        this.readerManager.disable();
    }

    enableFocus() {
        if (this.focusActive) return;
        this.focusActive = true;
        this.focusManager.enable();
        this.analyticsManager.trackModeActivation('focus');
    }

    disableFocus() {
        if (!this.focusActive) return;
        this.focusActive = false;
        this.focusManager.disable();
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

