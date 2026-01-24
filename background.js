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
