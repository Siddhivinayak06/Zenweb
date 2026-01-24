window.chrome = {
    runtime: {
        onMessage: {
            addListener: (callback) => {
                window.onMessageCallback = callback;
                console.log("Mock chrome.runtime.onMessage listener added");
            }
        },
        sendMessage: (msg) => {
            console.log("Mock chrome.runtime.sendMessage:", msg);
        }
    },
    storage: {
        local: {
            get: (keys, cb) => cb({}),
            set: (data) => console.log("Mock chrome.storage.local.set:", data)
        }
    }
};
