/**
 * CognitiveLoadScorer - Analyzes page complexity and cognitive demands
 * Provides a score from 0-100 indicating how mentally demanding a page is
 * Used to help users understand page complexity and trigger adaptive features
 */
class CognitiveLoadScorer {
    constructor() {
        this.lastScore = null;
        this.scoreCache = new Map();
    }

    /**
     * Calculate the overall cognitive load score for the current page
     * @returns {Object} Score object with overall score, breakdown, and recommendations
     */
    async scorePage() {
        const url = window.location.href;

        // Check cache (scores are valid for 30 seconds)
        const cached = this.scoreCache.get(url);
        if (cached && Date.now() - cached.timestamp < 30000) {
            return cached.result;
        }

        const metrics = {
            textDensity: this.calculateTextDensity(),
            visualComplexity: this.calculateVisualComplexity(),
            interactionDensity: this.calculateInteractionDensity(),
            readingLevel: this.calculateReadingLevel(),
            mediaLoad: this.calculateMediaLoad(),
            navigationComplexity: this.calculateNavigationComplexity()
        };

        const overallScore = this.computeOverallScore(metrics);
        const level = this.getLoadLevel(overallScore);
        const recommendations = this.generateRecommendations(metrics, overallScore);

        const result = {
            score: overallScore,
            level: level,
            breakdown: metrics,
            recommendations: recommendations,
            timestamp: Date.now()
        };

        // Cache the result
        this.scoreCache.set(url, { result, timestamp: Date.now() });
        this.lastScore = result;

        return result;
    }

    /**
     * Calculate text density - words per viewport area
     * Higher density = more cognitive load
     */
    calculateTextDensity() {
        const bodyText = document.body.innerText || '';
        const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

        const viewportArea = window.innerWidth * window.innerHeight;
        const bodyArea = document.body.scrollWidth * document.body.scrollHeight;

        // Words per 1000px² of viewport
        const density = (wordCount / (bodyArea / 1000)) * 10;

        // Normalize to 0-100
        // < 2 words/1000px² is low, > 10 is very high
        return Math.min(100, Math.max(0, density * 10));
    }

    /**
     * Calculate visual complexity based on DOM structure
     */
    calculateVisualComplexity() {
        const allElements = document.querySelectorAll('*');
        const elementCount = allElements.length;

        // DOM depth analysis
        let maxDepth = 0;
        const walkDOM = (node, depth) => {
            if (depth > maxDepth) maxDepth = depth;
            for (let child of node.children) {
                walkDOM(child, depth + 1);
            }
        };
        walkDOM(document.body, 0);

        // Count unique colors (simplified)
        const colors = new Set();
        const sampleElements = Array.from(allElements).slice(0, 100);
        sampleElements.forEach(el => {
            const style = getComputedStyle(el);
            colors.add(style.backgroundColor);
            colors.add(style.color);
        });

        // Count animations
        let animatedElements = 0;
        sampleElements.forEach(el => {
            const style = getComputedStyle(el);
            if (style.animationName !== 'none' || style.transition !== 'all 0s ease 0s') {
                animatedElements++;
            }
        });

        // Composite score
        const depthScore = Math.min(100, (maxDepth / 20) * 100);
        const elementScore = Math.min(100, (elementCount / 2000) * 100);
        const colorScore = Math.min(100, (colors.size / 30) * 100);
        const animationScore = Math.min(100, (animatedElements / 20) * 100);

        return (depthScore * 0.2 + elementScore * 0.3 + colorScore * 0.3 + animationScore * 0.2);
    }

    /**
     * Calculate interaction density - forms, buttons, links
     */
    calculateInteractionDensity() {
        const inputs = document.querySelectorAll('input, textarea, select').length;
        const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"]').length;
        const links = document.querySelectorAll('a[href]').length;

        // Weight: forms are highest cognitive load
        const interactionScore = (inputs * 3 + buttons * 2 + links * 0.5);

        // Normalize: > 100 interactive elements is high
        return Math.min(100, (interactionScore / 100) * 100);
    }

    /**
     * Calculate reading level using Flesch-Kincaid approximation
     */
    calculateReadingLevel() {
        const text = document.body.innerText || '';
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = text.split(/\s+/).filter(w => w.length > 0);

        if (sentences.length === 0 || words.length === 0) return 50;

        // Count syllables (approximation)
        const countSyllables = (word) => {
            word = word.toLowerCase();
            if (word.length <= 3) return 1;
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
            word = word.replace(/^y/, '');
            const match = word.match(/[aeiouy]{1,2}/g);
            return match ? match.length : 1;
        };

        let totalSyllables = 0;
        words.forEach(w => totalSyllables += countSyllables(w));

        const avgSentenceLength = words.length / sentences.length;
        const avgSyllablesPerWord = totalSyllables / words.length;

        // Flesch-Kincaid Grade Level (approximation)
        const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

        // Normalize: grade 5 = 0, grade 16+ = 100
        return Math.min(100, Math.max(0, ((gradeLevel - 5) / 11) * 100));
    }

    /**
     * Calculate media load - images, videos, iframes
     */
    calculateMediaLoad() {
        const images = document.querySelectorAll('img').length;
        const videos = document.querySelectorAll('video, iframe[src*="youtube"], iframe[src*="vimeo"]').length;
        const iframes = document.querySelectorAll('iframe').length;
        const autoplayMedia = document.querySelectorAll('video[autoplay], audio[autoplay]').length;

        // Weight: autoplay and videos are highest load
        const mediaScore = (images * 0.5 + videos * 3 + iframes * 2 + autoplayMedia * 5);

        // Normalize
        return Math.min(100, (mediaScore / 50) * 100);
    }

    /**
     * Calculate navigation complexity
     */
    calculateNavigationComplexity() {
        const navs = document.querySelectorAll('nav, [role="navigation"]').length;
        const menus = document.querySelectorAll('[class*="menu"], [class*="nav"]').length;
        const dropdowns = document.querySelectorAll('[class*="dropdown"], [class*="submenu"]').length;

        const navScore = (navs * 2 + menus * 1 + dropdowns * 3);

        return Math.min(100, (navScore / 20) * 100);
    }

    /**
     * Compute weighted overall score
     */
    computeOverallScore(metrics) {
        // Weights based on cognitive research
        const weights = {
            textDensity: 0.20,
            visualComplexity: 0.25,
            interactionDensity: 0.20,
            readingLevel: 0.15,
            mediaLoad: 0.10,
            navigationComplexity: 0.10
        };

        let totalScore = 0;
        for (const [key, weight] of Object.entries(weights)) {
            totalScore += (metrics[key] || 0) * weight;
        }

        return Math.round(totalScore);
    }

    /**
     * Get human-readable load level
     */
    getLoadLevel(score) {
        if (score < 30) return { level: 'low', label: 'Low Load', emoji: '🟢', color: '#10b981' };
        if (score < 60) return { level: 'medium', label: 'Moderate Load', emoji: '🟡', color: '#f59e0b' };
        return { level: 'high', label: 'High Load', emoji: '🔴', color: '#ef4444' };
    }

    /**
     * Generate personalized recommendations based on metrics
     */
    generateRecommendations(metrics, overallScore) {
        const recommendations = [];

        if (metrics.textDensity > 60) {
            recommendations.push({
                type: 'simplify',
                title: 'Try Simplify Mode',
                description: 'This page has dense text. Reader mode can help focus.',
                action: 'enable_simplify'
            });
        }

        if (metrics.visualComplexity > 60) {
            recommendations.push({
                type: 'focus',
                title: 'Enable Focus Mode',
                description: 'High visual complexity detected. Focus mode dims distractions.',
                action: 'enable_focus'
            });
        }

        if (metrics.readingLevel > 70) {
            recommendations.push({
                type: 'summary',
                title: 'Get AI Summary',
                description: 'Complex content detected. An AI summary might help.',
                action: 'summarize'
            });
        }

        if (metrics.mediaLoad > 50) {
            recommendations.push({
                type: 'profile',
                title: 'Try Sensory Profile',
                description: 'Lots of media on this page. Sensory profile can reduce stimulation.',
                action: 'set_profile_sensory'
            });
        }

        if (metrics.interactionDensity > 60) {
            recommendations.push({
                type: 'adhd',
                title: 'Try ADHD Profile',
                description: 'Many interactive elements. ADHD profile helps maintain focus.',
                action: 'set_profile_adhd'
            });
        }

        // Add general recommendation if score is high
        if (overallScore > 70 && recommendations.length === 0) {
            recommendations.push({
                type: 'general',
                title: 'Take Breaks',
                description: 'This page has high cognitive demands. Consider the Pomodoro timer.',
                action: 'enable_focus'
            });
        }

        return recommendations;
    }

    /**
     * Get the last calculated score
     */
    getLastScore() {
        return this.lastScore;
    }

    /**
     * Clear the score cache
     */
    clearCache() {
        this.scoreCache.clear();
        this.lastScore = null;
    }
}

// Export for use in content script
if (typeof window !== 'undefined') {
    window.CognitiveLoadScorer = CognitiveLoadScorer;
}
