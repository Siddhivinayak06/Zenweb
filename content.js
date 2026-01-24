class ContextAwareController {
    constructor() {
        this.mode = 'none'; // 'none', 'simplify', 'focus'

        // Initialize Modules
        this.themeManager = new ThemeManager();
        this.speechManager = new SpeechManager();
        this.aiManager = new AIManager();
        this.readerManager = new ReaderManager(this.themeManager, this.speechManager);
        this.focusManager = new FocusManager(this.themeManager); // Pass themeManager if focus needs it
    }

    init() {
        this.themeManager.init();
        this.readerManager.init();

        // Load Global Preferences
        chrome.storage.local.get(['dyslexiaFont'], (result) => {
            if (result.dyslexiaFont) {
                document.body.classList.add('context-aware-dyslexia-font');
            }
        });

        // Listen for internal events
        document.addEventListener('zenweb:close-reader', () => this.reset());

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'enable_simplify') {
                this.enableSimplify();
                sendResponse({ status: 'Simplify Mode Enabled' });
            } else if (request.action === 'enable_focus') {
                this.enableFocus();
                sendResponse({ status: 'Focus Mode Enabled' });
            } else if (request.action === 'toggle_simplify') {
                this.toggleSimplify();
                sendResponse({ status: 'Toggled Simplify' });
            } else if (request.action === 'toggle_focus') {
                this.toggleFocus();
                sendResponse({ status: 'Toggled Focus' });
            } else if (request.action === 'reset') {
                this.reset();
                sendResponse({ status: 'Reset' });
            } else if (request.action === 'summarize') {
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
                sendResponse({
                    mode: this.mode,
                    hiddenCount: 0, // Legacy metric, can remove or move to managers if needed
                    observerActive: this.mode !== 'none'
                });
            } else if (request.action.startsWith('set_theme_')) {
                // Handled by ThemeManager listener, but we ack here too
                sendResponse({ status: 'Theme Updated' });
            }
        });
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
    }

    enableFocus() {
        if (this.mode === 'focus') return;
        this.reset();
        this.mode = 'focus';
        this.focusManager.enable();
    }
}

const controller = new ContextAwareController();
controller.init();
