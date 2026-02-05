class ThemeManager {
    constructor() {
        this.currentTheme = 'light';
    }

    init() {
        chrome.storage.local.get(['theme', 'dyslexiaFont'], (result) => {
            if (result.theme) this.updateTheme(result.theme);
            if (result.dyslexiaFont) this.toggleDyslexia(true);
        });

        chrome.runtime.onMessage.addListener((request) => {
            if (request.action.startsWith('set_theme_')) {
                const theme = request.action.replace('set_theme_', '');
                this.updateTheme(theme);
            } else if (request.action === 'enable_dyslexia') {
                this.toggleDyslexia(true);
            } else if (request.action === 'disable_dyslexia') {
                this.toggleDyslexia(false);
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

    toggleDyslexia(enabled) {
        document.body.classList.toggle('context-aware-dyslexia-font', enabled);
        if (enabled) this.injectFonts();
    }

    injectFonts() {
        if (document.getElementById('zenweb-dyslexia-font')) return;

        const style = document.createElement('style');
        style.id = 'zenweb-dyslexia-font';
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=Comic+Neue:wght@400;700&display=swap');
            @font-face {
                font-family: 'OpenDyslexic';
                src: url('https://cdn.jsdelivr.net/npm/opendyslexic@2.0.0/opendyslexic-regular.woff') format('woff');
                font-weight: normal;
                font-style: normal;
            }
            body.context-aware-dyslexia-font,
            body.context-aware-dyslexia-font * {
                font-family: 'OpenDyslexic', 'Comic Neue', 'Comic Sans MS', sans-serif !important;
            }
        `;
        document.head.appendChild(style);
    }

    syncOverlayTheme(overlay) {
        overlay.classList.remove('context-aware-theme-light', 'context-aware-theme-dark', 'context-aware-theme-sepia');
        overlay.classList.add(`context-aware-theme-${this.currentTheme}`);
    }

    getCurrentTheme() {
        return this.currentTheme;
    }
}
