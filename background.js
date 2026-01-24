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
