/**
 * ZenWeb Analytics Dashboard
 * Displays usage statistics and cognitive load trends
 */

// Chart instances
let activityChart = null;
let modesChart = null;
let profilesChart = null;
let aiChart = null;
let cognitiveChart = null;

// Chart.js default configuration
Chart.defaults.color = '#94a3b8';
Chart.defaults.font.family = "'Outfit', 'Inter', system-ui, sans-serif";

// Color palette
const colors = {
    primary: '#6366f1',
    purple: '#8b5cf6',
    pink: '#d946ef',
    blue: '#3b82f6',
    green: '#10b981',
    yellow: '#f59e0b',
    red: '#ef4444',
    gray: '#64748b'
};

/**
 * Initialize dashboard on load
 */
document.addEventListener('DOMContentLoaded', async () => {
    await loadAnalytics();
    setupEventListeners();
});

/**
 * Setup event listeners
 */
function setupEventListeners() {
    document.getElementById('btn-refresh').addEventListener('click', loadAnalytics);
    document.getElementById('btn-export').addEventListener('click', exportData);
    document.getElementById('btn-clear').addEventListener('click', clearData);
    document.getElementById('time-range').addEventListener('change', loadAnalytics);
}

/**
 * Load and display analytics data
 */
async function loadAnalytics() {
    const days = parseInt(document.getElementById('time-range').value);

    try {
        const summary = await getAnalyticsSummary(days);
        updateStats(summary);
        updateCharts(summary);
        updateTopSites(summary.topSites);
    } catch (error) {
        console.error('Failed to load analytics:', error);
    }
}

/**
 * Get analytics summary from storage
 */
async function getAnalyticsSummary(days) {
    return new Promise((resolve) => {
        chrome.storage.local.get(['analyticsEvents'], (result) => {
            const events = result.analyticsEvents || [];
            const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
            const recentEvents = events.filter(e => e.timestamp > cutoff);

            const summary = calculateSummary(recentEvents, days);
            resolve(summary);
        });
    });
}

/**
 * Calculate summary metrics from events
 */
function calculateSummary(events, days) {
    const summary = {
        totalSessions: new Set(events.map(e => e.sessionId)).size,
        totalEvents: events.length,
        modeUsage: { simplify: 0, focus: 0 },
        profileUsage: {},
        avgCognitiveScore: 0,
        cognitiveScores: [],
        focusSessions: { total: 0, completed: 0, totalMinutes: 0 },
        aiUsage: { summary: 0, chat: 0, explain: 0 },
        dailyActivity: {},
        topSites: {}
    };

    // Initialize days array for activity chart
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));
        const key = date.toISOString().split('T')[0];
        summary.dailyActivity[key] = 0;
    }

    // Process events
    events.forEach(event => {
        const day = new Date(event.timestamp).toISOString().split('T')[0];
        if (summary.dailyActivity[day] !== undefined) {
            summary.dailyActivity[day]++;
        }

        if (event.url) {
            summary.topSites[event.url] = (summary.topSites[event.url] || 0) + 1;
        }

        switch (event.type) {
            case 'mode_activation':
                if (event.data?.mode === 'simplify') summary.modeUsage.simplify++;
                if (event.data?.mode === 'focus') summary.modeUsage.focus++;
                break;

            case 'profile_used':
                const profile = event.data?.profileId || 'unknown';
                summary.profileUsage[profile] = (summary.profileUsage[profile] || 0) + 1;
                break;

            case 'cognitive_score':
                if (event.data?.score) summary.cognitiveScores.push(event.data.score);
                break;

            case 'focus_session':
                summary.focusSessions.total++;
                if (event.data?.completed) summary.focusSessions.completed++;
                summary.focusSessions.totalMinutes += Math.round((event.data?.duration || 0) / 60000);
                break;

            case 'ai_usage':
                const feature = event.data?.feature;
                if (feature && summary.aiUsage[feature] !== undefined) {
                    summary.aiUsage[feature]++;
                }
                break;
        }
    });

    // Calculate average cognitive score
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
 * Update stat cards
 */
function updateStats(summary) {
    document.getElementById('stat-sessions').textContent = summary.totalSessions;
    document.getElementById('stat-focus-time').textContent = summary.focusSessions.totalMinutes;
    document.getElementById('stat-avg-cognitive').textContent = summary.avgCognitiveScore || '-';

    const completionRate = summary.focusSessions.total > 0
        ? Math.round((summary.focusSessions.completed / summary.focusSessions.total) * 100)
        : 0;
    document.getElementById('stat-completion').textContent = completionRate + '%';
}

/**
 * Update all charts
 */
function updateCharts(summary) {
    updateActivityChart(summary.dailyActivity);
    updateModesChart(summary.modeUsage);
    updateProfilesChart(summary.profileUsage);
    updateAIChart(summary.aiUsage);
    updateCognitiveChart(summary.cognitiveScores);
}

/**
 * Daily Activity Line Chart
 */
function updateActivityChart(dailyActivity) {
    const ctx = document.getElementById('chart-activity').getContext('2d');

    const labels = Object.keys(dailyActivity).map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    const data = Object.values(dailyActivity);

    if (activityChart) activityChart.destroy();

    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Events',
                data: data,
                borderColor: colors.primary,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                fill: true,
                tension: 0.4,
                pointBackgroundColor: colors.primary,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

/**
 * Mode Usage Doughnut Chart
 */
function updateModesChart(modeUsage) {
    const ctx = document.getElementById('chart-modes').getContext('2d');

    if (modesChart) modesChart.destroy();

    const hasData = modeUsage.simplify > 0 || modeUsage.focus > 0;

    modesChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Simplify', 'Focus'],
            datasets: [{
                data: hasData ? [modeUsage.simplify, modeUsage.focus] : [1, 1],
                backgroundColor: hasData ? [colors.blue, colors.purple] : [colors.gray, colors.gray],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 20, usePointStyle: true }
                }
            }
        }
    });
}

/**
 * Profile Usage Bar Chart
 */
function updateProfilesChart(profileUsage) {
    const ctx = document.getElementById('chart-profiles').getContext('2d');

    if (profilesChart) profilesChart.destroy();

    const labels = Object.keys(profileUsage);
    const data = Object.values(profileUsage);

    const profileColors = {
        adhd: colors.yellow,
        dyslexia: colors.blue,
        lowVision: colors.green,
        sensory: colors.purple,
        custom: colors.pink
    };

    const backgroundColors = labels.map(l => profileColors[l] || colors.gray);

    profilesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels.length > 0 ? labels : ['No Data'],
            datasets: [{
                data: data.length > 0 ? data : [0],
                backgroundColor: backgroundColors.length > 0 ? backgroundColors : [colors.gray],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

/**
 * AI Usage Polar Area Chart
 */
function updateAIChart(aiUsage) {
    const ctx = document.getElementById('chart-ai').getContext('2d');

    if (aiChart) aiChart.destroy();

    const hasData = aiUsage.summary > 0 || aiUsage.chat > 0 || aiUsage.explain > 0;

    aiChart = new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels: ['Summary', 'Chat', 'Explain'],
            datasets: [{
                data: hasData ? [aiUsage.summary, aiUsage.chat, aiUsage.explain] : [1, 1, 1],
                backgroundColor: hasData
                    ? ['rgba(99, 102, 241, 0.7)', 'rgba(139, 92, 246, 0.7)', 'rgba(217, 70, 239, 0.7)']
                    : ['rgba(100, 116, 139, 0.3)', 'rgba(100, 116, 139, 0.3)', 'rgba(100, 116, 139, 0.3)']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, usePointStyle: true }
                }
            },
            scales: {
                r: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { display: false }
                }
            }
        }
    });
}

/**
 * Cognitive Load Histogram
 */
function updateCognitiveChart(scores) {
    const ctx = document.getElementById('chart-cognitive').getContext('2d');

    if (cognitiveChart) cognitiveChart.destroy();

    // Bin scores into ranges
    const bins = { 'Low (0-30)': 0, 'Medium (31-60)': 0, 'High (61-100)': 0 };
    scores.forEach(score => {
        if (score <= 30) bins['Low (0-30)']++;
        else if (score <= 60) bins['Medium (31-60)']++;
        else bins['High (61-100)']++;
    });

    const hasData = scores.length > 0;

    cognitiveChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(bins),
            datasets: [{
                data: hasData ? Object.values(bins) : [0, 0, 0],
                backgroundColor: [colors.green, colors.yellow, colors.red],
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: { grid: { display: false } }
            }
        }
    });
}

/**
 * Update top sites list
 */
function updateTopSites(topSites) {
    const list = document.getElementById('top-sites');
    const entries = Object.entries(topSites);

    if (entries.length === 0) {
        list.innerHTML = '<li class="empty-state">No data yet</li>';
        return;
    }

    list.innerHTML = entries.map(([site, count]) => `
        <li>
            <span class="site-name">${escapeHtml(site)}</span>
            <span class="site-count">${count} visits</span>
        </li>
    `).join('');
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Export analytics data
 */
async function exportData() {
    const data = await new Promise((resolve) => {
        chrome.storage.local.get(['analyticsEvents'], (result) => {
            resolve(result.analyticsEvents || []);
        });
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `zenweb-analytics-${new Date().toISOString().split('T')[0]}.json`;
    a.click();

    URL.revokeObjectURL(url);
}

/**
 * Clear all analytics data
 */
async function clearData() {
    if (!confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
        return;
    }

    await new Promise((resolve) => {
        chrome.storage.local.remove(['analyticsEvents'], resolve);
    });

    loadAnalytics();
}
