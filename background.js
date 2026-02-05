// Configure Side Panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("ZenWeb: Side Panel behavior error", error));

// Import Dependencies (Order matters)
importScripts('config.js', 'lib/supabase.js', 'modules/supabase-client.js', 'modules/auth.js');

// Initialize AuthManager & Expose Globally in Background Scope
const authManager = new AuthManager();
// Wait for init? authManager.init() is async.
// Since it relies on storage, it's fast. We'll handle 'not ready' gracefully.
authManager.init();

// Message Handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 1. Script Injection
    if (request.action === 'inject_script') {
        chrome.scripting.executeScript({
            target: { tabId: sender.tab.id },
            files: [request.file]
        }).then(() => {
            sendResponse({ status: 'injected' });
        }).catch((err) => {
            console.error("Script injection failed", err);
            sendResponse({ error: err.message });
        });
        return true; // Async response
    }

    // 2. Auth & Subscription Messages
    if (request.action === 'login') {
        authManager.login(request.email, request.password)
            .then(user => sendResponse(user))
            .catch(err => sendResponse({ error: { message: err.message || 'Login failed' } }));
        return true;
    }
    if (request.action === 'signup') {
        authManager.signup(request.email, request.password)
            .then(user => sendResponse(user))
            .catch(err => sendResponse({ error: { message: err.message || 'Signup failed' } }));
        return true;
    }
    if (request.action === 'logout') {
        authManager.logout()
            .then(() => sendResponse({ success: true }))
            .catch(err => sendResponse({ error: { message: err.message || 'Logout failed' } }));
        return true;
    }
    if (request.action === 'get_user_status') {
        sendResponse(authManager.getUser());
        return false;
    }
    if (request.action === 'check_usage_limit') {
        const result = authManager.checkLimit(request.feature || 'ai_summary');
        sendResponse(result);
        return false;
    }
    // Simulate Upgrade
    if (request.action === 'simulate_upgrade') {
        authManager.upgrade()
            .then(result => sendResponse({ success: result, isPro: true }))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    // 3. AI / API Handlers
    if (request.action === 'summarize_with_api') {
        handleSummarizeWithApi(request.text, sendResponse);
        return true; // Keep channel open for async response
    }
    if (request.action === 'chat_with_api') {
        handleChatWithApi(request.question, request.context, sendResponse);
        return true;
    }

    // 4. Navigation
    if (request.action === 'open_upsell_panel' || request.action === 'open_pricing') {
        chrome.tabs.create({ url: chrome.runtime.getURL('pricing.html') });
        return true;
    }
});

async function handleSummarizeWithApi(text, sendResponse) {
    // 1. Check Usage Limit
    const limit = authManager.checkLimit('ai_summary');
    if (!limit.allowed) {
        sendResponse({
            error: 'You have reached your monthly free limit.',
            limitReached: true,
            isPro: false
        });
        return;
    }

    try {
        const data = await chrome.storage.sync.get('geminiApiKey');
        const apiKey = data.geminiApiKey;

        if (!apiKey) {
            sendResponse({ error: 'No API Key found. Please add it in settings.' });
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Summarize the following article in 3 distinct, concise bullet points (Start each with "• "). Focus on the main ideas:\n\n${text}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            sendResponse({ error: errorData.error?.message || response.statusText });
            return;
        }

        const result = await response.json();
        const summaryText = result.candidates[0].content.parts[0].text;
        const points = summaryText.split('\n')
            .map(line => line.trim().replace(/^•\s*/, ''))
            .filter(line => line.length > 0);

        // 2. Increment Usage if successful and not Pro
        // authManager knows if user is pro inside checkLimit/trackUsage? 
        // No, checkLimit returns isPro? No, logic inside authManager
        // Let's track usage regardless, authManager handles logic
        await authManager.trackUsage('ai_summary');

        const user = authManager.getUser();
        const isPro = user && user.plan === 'pro';
        const remaining = isPro ? 'Unlimited' : (limit.remaining !== undefined ? limit.remaining - 1 : 'N/A');

        sendResponse({ summary: points, remaining: isPro ? 'Unlimited' : remaining });

    } catch (e) {
        console.error("Background API Fetch Failed:", e);
        sendResponse({ error: 'Network request failed.' });
    }
}

async function handleChatWithApi(question, context, sendResponse) {
    // 1. Check Usage Limit (shared limit with summary? or separate? config says shared usually or per-feature)
    // auth.js had 'ai_summary' limit. We should probably reuse it or add 'ai_chat'.
    // For now reusing ai_summary bucket or adding to config
    const limit = authManager.checkLimit('ai_summary'); // Using same quota for simplicity
    if (!limit.allowed) {
        sendResponse({
            error: 'Free limit reached.',
            limitReached: true,
            isPro: false
        });
        return;
    }

    try {
        const data = await chrome.storage.sync.get('geminiApiKey');
        const apiKey = data.geminiApiKey;

        if (!apiKey) {
            sendResponse({ error: 'No API Key found.' });
            return;
        }

        const prompt = `You are a helpful assistant analyzing a webpage. Answer the user's question based ONLY on the provided page content. Be concise.
PAGE CONTENT: ${context.substring(0, 15000)}
USER QUESTION: ${question}
ANSWER:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorData = await response.json();
            sendResponse({ error: errorData.error?.message || 'API Error' });
            return;
        }

        const result = await response.json();
        const answer = result.candidates[0].content.parts[0].text;

        await authManager.trackUsage('ai_summary');

        const user = authManager.getUser();
        const isPro = user && user.plan === 'pro';

        sendResponse({ answer, remaining: isPro ? 'Unlimited' : 'N/A' });

    } catch (e) {
        console.error("Chat API Failed:", e);
        sendResponse({ error: 'Request failed.' });
    }
}

// Global Commands
chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
        const tabId = tabs[0].id;
        const message = command === 'toggle-simplify' ? { action: 'toggle_simplify' } :
            command === 'toggle-focus' ? { action: 'toggle_focus' } : null;
        if (message) chrome.tabs.sendMessage(tabId, message);
    });
});
