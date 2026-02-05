// Supabase Client Wrapper associated with config.js
// Assumes supabase.js (UMD) and config.js are loaded before this script.

class SupabaseManager {
    constructor() {
        // Use globalThis to support both Window (UI) and ServiceWorker (Background)
        const globalScope = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window);

        if (!globalScope.supabase) {
            console.error('ZenWeb: Supabase library not loaded');
            return;
        }
        if (!globalScope.ZenWebConfig) {
            console.error('ZenWeb: Config not loaded');
            return;
        }

        const { createClient } = globalScope.supabase;
        const { SUPABASE_URL, SUPABASE_KEY } = globalScope.ZenWebConfig;

        // Custom Storage Adapter for Chrome Extension
        const chromeStorageAdapter = {
            getItem: (key) => {
                return new Promise((resolve) => {
                    chrome.storage.local.get([key], (result) => {
                        resolve(result[key]);
                    });
                });
            },
            setItem: (key, value) => {
                return new Promise((resolve) => {
                    chrome.storage.local.set({ [key]: value }, () => {
                        resolve();
                    });
                });
            },
            removeItem: (key) => {
                return new Promise((resolve) => {
                    chrome.storage.local.remove([key], () => {
                        resolve();
                    });
                });
            }
        };

        this.client = createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                storage: chromeStorageAdapter,
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
    }

    getClient() {
        return this.client;
    }
}

// Expose globally for other modules
const globalScope = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window);
globalScope.supabaseManagerInstance = new SupabaseManager();
globalScope.supabaseClient = globalScope.supabaseManagerInstance.getClient();
