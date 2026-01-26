/**
 * AnalyticsManager - Tracks usage patterns and cognitive metrics
 * Stores data locally with optional cloud sync
 * Privacy-focused with URL anonymization
 */
class AnalyticsManager {
    constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStart = Date.now();
        this.events = [];
        this.cloudSyncEnabled = false;
        this.maxLocalEvents = 1000;
        this.flushInterval = null;
        this.isValid = true;
    }

    /**
     * Check if extension context is still valid
     */
    isContextValid() {
        try {
            return chrome.runtime && chrome.runtime.id && this.isValid;
        } catch {
            this.isValid = false;
            return false;
        }
    }

    /**
     * Initialize analytics and load settings
     */
    async init() {
        if (!this.isContextValid()) return;

        try {
            await this.loadSettings();
            this.trackEvent('session_start', { timestamp: this.sessionStart });

            // Set up periodic flush to storage
            this.flushInterval = setInterval(() => {
                if (this.isContextValid()) {
                    this.flushToStorage();
                } else {
                    this.cleanup();
                }
            }, 30000);

            // Track page unload
            window.addEventListener('beforeunload', () => {
                if (this.isContextValid()) {
                    this.trackEvent('session_end', {
                        duration: Date.now() - this.sessionStart
                    });
                    this.flushToStorage();
                }
            });
        } catch (e) {
            console.log('ZenWeb Analytics: Init error -', e.message);
            this.isValid = false;
        }
    }

    /**
     * Cleanup intervals and resources
     */
    cleanup() {
        this.isValid = false;
        if (this.flushInterval) {
            clearInterval(this.flushInterval);
            this.flushInterval = null;
        }
    }

    /**
     * Load analytics settings from storage
     */
    async loadSettings() {
        if (!this.isContextValid()) return;

        return new Promise((resolve) => {
            try {
                chrome.storage.sync.get(['analyticsEnabled', 'cloudSyncEnabled'], (result) => {
                    try {
                        if (chrome.runtime.lastError) {
                            console.log('ZenWeb Analytics: Storage error');
                            resolve();
                            return;
                        }
                        this.cloudSyncEnabled = result.cloudSyncEnabled || false;
                        resolve();
                    } catch (e) {
                        this.isValid = false;
                        resolve();
                    }
                });
            } catch (e) {
                this.isValid = false;
                resolve();
            }
        });
    }

    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return 'sess_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Anonymize URL for privacy
     * Keeps domain and path structure but removes query params and specific identifiers
     */
    anonymizeUrl(url) {
        try {
            const parsed = new URL(url);
            // Keep only domain and general path structure
            const pathParts = parsed.pathname.split('/').slice(0, 3);
            return parsed.hostname + pathParts.join('/');
        } catch {
            return 'unknown';
        }
    }

    /**
     * Track an event
     */
    trackEvent(eventType, data = {}) {
        if (!this.isContextValid()) return null;

        const event = {
            id: this.generateEventId(),
            sessionId: this.sessionId,
            type: eventType,
            timestamp: Date.now(),
            url: this.anonymizeUrl(window.location.href),
            data: data
        };

        this.events.push(event);

        // Trim if too many events in memory
        if (this.events.length > 100) {
            this.flushToStorage();
        }

        return event;
    }

    /**
     * Generate unique event ID
     */
    generateEventId() {
        return 'evt_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    /**
     * Track mode activation
     */
    trackModeActivation(mode, duration = null) {
        return this.trackEvent('mode_activation', {
            mode: mode,
            duration: duration
        });
    }

    /**
     * Track profile usage
     */
    trackProfileUsage(profileId) {
        return this.trackEvent('profile_used', {
            profileId: profileId
        });
    }

    /**
     * Track cognitive load score
     */
    trackCognitiveScore(score, level) {
        return this.trackEvent('cognitive_score', {
            score: score,
            level: level
        });
    }

    /**
     * Track focus session (Pomodoro)
     */
    trackFocusSession(duration, completed) {
        return this.trackEvent('focus_session', {
            duration: duration,
            completed: completed
        });
    }

    /**
     * Track AI feature usage
     */
    trackAIUsage(feature) {
        return this.trackEvent('ai_usage', {
            feature: feature // 'summary', 'chat', 'explain'
        });
    }

    /**
     * Flush events to local storage
     */
    async flushToStorage() {
        if (!this.isContextValid() || this.events.length === 0) return;

        return new Promise((resolve) => {
            try {
                chrome.storage.local.get(['analyticsEvents'], (result) => {
                    try {
                        if (chrome.runtime.lastError || !this.isContextValid()) {
                            this.cleanup();
                            resolve();
                            return;
                        }

                        let storedEvents = result.analyticsEvents || [];

                        // Append new events
                        storedEvents = [...storedEvents, ...this.events];

                        // Trim to max size (keep most recent)
                        if (storedEvents.length > this.maxLocalEvents) {
                            storedEvents = storedEvents.slice(-this.maxLocalEvents);
                        }

                        chrome.storage.local.set({ analyticsEvents: storedEvents }, () => {
                            try {
                                if (chrome.runtime.lastError) {
                                    this.cleanup();
                                } else {
                                    this.events = []; // Clear in-memory buffer
                                }
                                resolve();
                            } catch (e) {
                                this.cleanup();
                                resolve();
                            }
                        });
                    } catch (e) {
                        this.cleanup();
                        resolve();
                    }
                });
            } catch (e) {
                this.cleanup();
                resolve();
            }
        });
    }

    /**
     * Get all stored analytics data
     */
    async getStoredAnalytics() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['analyticsEvents'], (result) => {
                resolve(result.analyticsEvents || []);
            });
        });
    }

    /**
     * Get analytics summary for dashboard
     */
    async getSummary(days = 7) {
        const events = await this.getStoredAnalytics();
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);

        const recentEvents = events.filter(e => e.timestamp > cutoff);

        // Calculate summary metrics
        const summary = {
            totalSessions: new Set(recentEvents.map(e => e.sessionId)).size,
            totalEvents: recentEvents.length,

            // Mode usage
            modeUsage: {
                simplify: 0,
                focus: 0
            },

            // Profile usage
            profileUsage: {},

            // Cognitive scores
            avgCognitiveScore: 0,
            cognitiveScores: [],

            // Focus sessions
            focusSessions: {
                total: 0,
                completed: 0,
                totalMinutes: 0
            },

            // AI usage
            aiUsage: {
                summary: 0,
                chat: 0,
                explain: 0
            },

            // Daily breakdown
            dailyActivity: {},

            // Top sites
            topSites: {}
        };

        // Process events
        recentEvents.forEach(event => {
            // Daily activity
            const day = new Date(event.timestamp).toISOString().split('T')[0];
            summary.dailyActivity[day] = (summary.dailyActivity[day] || 0) + 1;

            // Site tracking
            if (event.url) {
                summary.topSites[event.url] = (summary.topSites[event.url] || 0) + 1;
            }

            // Event type specific
            switch (event.type) {
                case 'mode_activation':
                    if (event.data.mode === 'simplify') summary.modeUsage.simplify++;
                    if (event.data.mode === 'focus') summary.modeUsage.focus++;
                    break;

                case 'profile_used':
                    const profile = event.data.profileId;
                    summary.profileUsage[profile] = (summary.profileUsage[profile] || 0) + 1;
                    break;

                case 'cognitive_score':
                    summary.cognitiveScores.push(event.data.score);
                    break;

                case 'focus_session':
                    summary.focusSessions.total++;
                    if (event.data.completed) summary.focusSessions.completed++;
                    summary.focusSessions.totalMinutes += Math.round(event.data.duration / 60000);
                    break;

                case 'ai_usage':
                    if (summary.aiUsage[event.data.feature] !== undefined) {
                        summary.aiUsage[event.data.feature]++;
                    }
                    break;
            }
        });

        // Calculate averages
        if (summary.cognitiveScores.length > 0) {
            summary.avgCognitiveScore = Math.round(
                summary.cognitiveScores.reduce((a, b) => a + b, 0) / summary.cognitiveScores.length
            );
        }

        // Sort top sites
        summary.topSites = Object.entries(summary.topSites)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .reduce((obj, [key, val]) => ({ ...obj, [key]: val }), {});

        return summary;
    }

    /**
     * Export analytics data as JSON
     */
    async exportData() {
        const events = await this.getStoredAnalytics();
        const summary = await this.getSummary(30);

        return {
            exportDate: new Date().toISOString(),
            totalEvents: events.length,
            summary: summary,
            events: events
        };
    }

    /**
     * Clear all analytics data
     */
    async clearData() {
        this.events = [];
        return new Promise((resolve) => {
            chrome.storage.local.remove(['analyticsEvents'], resolve);
        });
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.AnalyticsManager = AnalyticsManager;
}
