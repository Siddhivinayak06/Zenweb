class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
    }

    init() {
        chrome.storage.local.get(['theme'], (result) => {
            if (result.theme) this.updateTheme(result.theme);
        });

        chrome.runtime.onMessage.addListener((request) => {
            if (request.action.startsWith('set_theme_')) {
                const theme = request.action.replace('set_theme_', '');
                this.updateTheme(theme);
                // No response needed here as it's fire-and-forget or handled by main controller
            }
        });
    }

    updateTheme(theme) {
        this.currentTheme = theme;
        // Update Body
        document.body.classList.remove('context-aware-theme-light', 'context-aware-theme-dark', 'context-aware-theme-sepia');
        document.body.classList.add(`context-aware-theme-${theme}`);

        // Update Overlay if it exists
        const overlay = document.querySelector('.context-aware-reader-overlay');
        if (overlay) {
            this.syncOverlayTheme(overlay);
        }
    }

    syncOverlayTheme(overlay) {
        overlay.classList.remove('context-aware-theme-light', 'context-aware-theme-dark', 'context-aware-theme-sepia');
        overlay.classList.add(`context-aware-theme-${this.currentTheme}`);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}
