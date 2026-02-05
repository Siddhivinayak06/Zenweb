class AuthManager {
    constructor() {
        const globalScope = typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : window);
        this.client = globalScope.supabaseClient;
        this.currentUser = null;
        this.limits = {
            'free': {
                'ai_summary': 5,
                'action_extractor': 0, // Pro only
                'wizard': 3
            },
            'pro': {
                'ai_summary': 9999,
                'action_extractor': 9999,
                'wizard': 9999
            }
        };
        // We do NOT call init() automatically because it's async and we want to control flow
    }

    async init() {
        if (!this.client) {
            console.error("AuthManager: Supabase client not initialized");
            return;
        }

        // Check active session
        const { data: { session }, error } = await this.client.auth.getSession();

        if (session?.user) {
            this.currentUser = this._normalizeUser(session.user);
            await this._loadUsage(this.currentUser.id);
        } else {
            this.currentUser = null;
            await this._loadUsage('anonymous');
        }

        // Listen for auth changes
        this.client.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
                this.currentUser = this._normalizeUser(session.user);
                await this._loadUsage(this.currentUser.id);
            } else {
                this.currentUser = null;
                await this._loadUsage('anonymous');
            }
        });
    }

    _normalizeUser(supabaseUser) {
        return {
            id: supabaseUser.id,
            email: supabaseUser.email,
            name: supabaseUser.user_metadata?.full_name || supabaseUser.email.split('@')[0],
            avatar: supabaseUser.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${supabaseUser.email.split('@')[0]}&background=random`,
            // Check 'plan' in metadata, fallback to 'free'
            plan: supabaseUser.user_metadata?.plan || 'free'
        };
    }

    async _loadUsage(userId) {
        const key = `usage_${userId}`;
        const result = await chrome.storage.sync.get([key, 'last_usage_date']);

        // Reset if day changed (GLOBAL check, not per user to avoid complex sync logic for now)
        const today = new Date().toDateString();
        if (result.last_usage_date !== today) {
            await chrome.storage.sync.set({
                last_usage_date: today,
                // We don't wipe specific user key here as we'd need to list them all.
                // Instead we trust the date check. If date is old, we effectively start fresh.
            });
            // If date changed, we logically reset current local tracking to 0
            // But we lazy-clear storage on write.
            this.usage = {};
        } else {
            this.usage = result[key] || {};
        }
        this.currentUsageKey = key;
    }

    async login(email, password) {
        const { data, error } = await this.client.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return this._normalizeUser(data.user);
    }

    async signup(email, password) {
        const { data, error } = await this.client.auth.signUp({
            email,
            password,
            options: {
                data: { plan: 'free' } // Default metadata
            }
        });
        if (error) throw error;
        return data.user ? this._normalizeUser(data.user) : null;
    }

    async logout() {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
        this.currentUser = null;
    }

    async upgrade() {
        if (!this.currentUser) return false;

        // In a real app, this would be a webhook from Stripe updating Supabase.
        // For MVP, we update user_metadata.
        const { data, error } = await this.client.auth.updateUser({
            data: { plan: 'pro' }
        });

        if (error) {
            console.error("Upgrade failed", error);
            return false;
        }

        this.currentUser = this._normalizeUser(data.user);
        return true;
    }

    getPlan() {
        return this.currentUser ? this.currentUser.plan : 'free';
    }

    checkLimit(feature) {
        const plan = this.getPlan();
        const limit = this.limits[plan][feature];
        const current = this.usage[feature] || 0;

        if (current >= limit) {
            return {
                allowed: false,
                reason: plan === 'free' ? 'limit_reached' : 'error',
                limit: limit,
                current: current
            };
        }
        return { allowed: true };
    }

    async trackUsage(feature) {
        this.usage[feature] = (this.usage[feature] || 0) + 1;

        // Persist
        if (this.currentUsageKey) {
            await chrome.storage.sync.set({ [this.currentUsageKey]: this.usage });
        }
    }

    getUser() {
        return this.currentUser;
    }
}
