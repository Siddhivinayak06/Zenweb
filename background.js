// Configure Side Panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error("ZenWeb: Side Panel behavior error", error));

chrome.commands.onCommand.addListener((command) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;

        const tabId = tabs[0].id;
        if (!tabId) return;

        const message = command === 'toggle-simplify' ? { action: 'toggle_simplify' } :
            command === 'toggle-focus' ? { action: 'toggle_focus' } : null;

        if (message) {
            chrome.tabs.sendMessage(tabId, message, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("ContextAware: Could not send message to tab. It might be a restricted URL or loading.", chrome.runtime.lastError.message);
                }
            });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
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

    if (request.action === 'summarize_with_api') {
        handleSummarizeWithApi(request.text, sendResponse);
        return true; // Keep channel open for async response
    }
});

async function handleSummarizeWithApi(text, sendResponse) {
    try {
        const data = await chrome.storage.sync.get('geminiApiKey');
        const apiKey = data.geminiApiKey;

        if (!apiKey) {
            sendResponse({ error: 'No API Key found. Please add it in settings.' });
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
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
            console.error("Gemini API Error Detail:", JSON.stringify(errorData, null, 2));
            const errorMessage = errorData.error?.message || response.statusText || "Unknown API Error";
            sendResponse({ error: `API Error: ${errorMessage}` });
            return;
        }

        const result = await response.json();
        const summaryText = result.candidates[0].content.parts[0].text;

        // Convert to array of points
        const points = summaryText.split('\n')
            .map(line => line.trim().replace(/^•\s*/, ''))
            .filter(line => line.length > 0);

        sendResponse({ summary: points });

    } catch (e) {
        console.error("Background API Fetch Failed:", e);
        sendResponse({ error: 'Network request failed.' });
    }
}

// Context Menu for "Explain Selection"
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'zenweb-explain',
        title: 'Explain with ZenWeb',
        contexts: ['selection']
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'zenweb-explain' && info.selectionText) {
        // Open side panel and send the selection
        chrome.sidePanel.open({ tabId: tab.id }).then(() => {
            // Small delay to ensure panel is ready
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: 'explain_selection',
                    text: info.selectionText
                });
            }, 300);
        });
    }
});

// Chat with Page handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'chat_with_api') {
        handleChatWithApi(request.question, request.context, sendResponse);
        return true;
    }
});

async function handleChatWithApi(question, context, sendResponse) {
    try {
        const data = await chrome.storage.sync.get('geminiApiKey');
        const apiKey = data.geminiApiKey;

        if (!apiKey) {
            sendResponse({ error: 'No API Key found. Please add it in settings.' });
            return;
        }

        const prompt = `You are a helpful assistant analyzing a webpage. Answer the user's question based ONLY on the provided page content. Be concise.

PAGE CONTENT:
${context.substring(0, 15000)}

USER QUESTION: ${question}

ANSWER:`;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            sendResponse({ error: errorData.error?.message || 'API Error' });
            return;
        }

        const result = await response.json();
        const answer = result.candidates[0].content.parts[0].text;
        sendResponse({ answer });

    } catch (e) {
        console.error("Chat API Failed:", e);
        sendResponse({ error: 'Request failed.' });
    }
}
