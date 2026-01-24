document.addEventListener('DOMContentLoaded', () => {
  const btnSimplify = document.getElementById('btn-simplify');
  const btnFocus = document.getElementById('btn-focus');
  const btnReset = document.getElementById('btn-reset');
  const btnSummarize = document.getElementById('btn-summarize');
  const summaryContainer = document.getElementById('summary-container');

  // Status Elements
  const connectionStatus = document.getElementById('connection-status');
  const statusText = connectionStatus.querySelector('.status-text');
  const liveStats = document.getElementById('live-stats');
  const distractionCount = document.getElementById('distraction-count');
  const activeMode = document.getElementById('active-mode');

  // Load current state
  const checkDyslexia = document.getElementById('check-dyslexia');
  const themeBtns = document.querySelectorAll('.theme-btn');

  // Settings Elements
  const btnSettings = document.getElementById('btn-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const apiKeyInput = document.getElementById('api-key-input');
  const settingsStatus = document.getElementById('settings-status');

  // Load API Key
  chrome.storage.sync.get(['geminiApiKey'], (result) => {
    if (result.geminiApiKey) {
      apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Track the active tab ID to ensure UI reflects the correct content
  let currentTabId = null;

  async function updateActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      refreshStatus();
    }
  }

  // Listen for tab switches to update UI context
  chrome.tabs.onActivated.addListener(updateActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (tabId === currentTabId && changeInfo.status === 'complete') {
      refreshStatus();
    }
  });

  // Initial Data Load (Global prefs)
  chrome.storage.local.get(['dyslexiaFont', 'theme'], (result) => {
    // Explicitly set checked state
    checkDyslexia.checked = !!result.dyslexiaFont;
    const currentTheme = result.theme || 'light';
    updateThemeUI(currentTheme);
  });

  // Listen for storage changes (Sync across contexts)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.theme) {
        updateThemeUI(changes.theme.newValue);
      }
      if (changes.dyslexiaFont) {
        checkDyslexia.checked = !!changes.dyslexiaFont.newValue;
      }
    }
  });

  // Real-time Status Check
  updateActiveTab();
  setInterval(refreshStatus, 1000); // Poll every 1s

  function refreshStatus() {
    if (!currentTabId) return;

    chrome.tabs.sendMessage(currentTabId, { action: 'get_status' }, (response) => {
      // Suppress error on pages where content script can't run
      if (chrome.runtime.lastError) {
        connectionStatus.classList.remove('connected');
        statusText.textContent = "Disconnected";
        liveStats.classList.add('hidden');
        // Disable controls if disconnected?
        return;
      }

      // Update Connection UI
      connectionStatus.classList.add('connected');
      statusText.textContent = "Active";

      // Update Stats
      if (response.mode !== 'none') {
        liveStats.classList.remove('hidden');
        if (distractionCount.innerText != response.hiddenCount) {
          distractionCount.innerText = response.hiddenCount;
        }
        activeMode.innerText = response.mode.charAt(0).toUpperCase() + response.mode.slice(1);
      } else {
        liveStats.classList.add('hidden');
      }

      // Sync Mode UI
      updateModeUI(response.mode);
    });
  }

  function updateModeUI(mode) {
    btnSimplify.classList.remove('active');
    btnFocus.classList.remove('active');
    if (mode === 'simplify') btnSimplify.classList.add('active');
    if (mode === 'focus') btnFocus.classList.add('active');
  }

  function updateThemeUI(theme) {
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    themeBtns.forEach(btn => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // Event Listeners
  if (checkDyslexia) {
    checkDyslexia.addEventListener('change', (e) => {
      const isEnabled = e.target.checked;
      chrome.storage.local.set({ dyslexiaFont: isEnabled });
      sendMessageToCurrentTab(isEnabled ? 'enable_dyslexia' : 'disable_dyslexia');
    });
  }

  if (themeBtns) {
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        updateThemeUI(theme);
        chrome.storage.local.set({ theme: theme });
        sendMessageToCurrentTab(`set_theme_${theme}`);
      });
    });
  }

  function sendMessageToCurrentTab(action, callback) {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: action }, (response) => {
      if (chrome.runtime.lastError) {
        // Ignore errors on restricted pages
        console.log('ZenWeb: Tab not available for messaging');
        return;
      }
      if (callback) callback(response);
    });
  }

  btnSimplify.addEventListener('click', () => {
    const isActive = btnSimplify.classList.contains('active');
    const newMode = isActive ? 'none' : 'simplify';
    setMode(newMode);
  });

  btnFocus.addEventListener('click', () => {
    const isActive = btnFocus.classList.contains('active');
    const newMode = isActive ? 'none' : 'focus';
    setMode(newMode);
  });

  btnReset.addEventListener('click', () => {
    setMode('none');
  });

  function setMode(mode) {
    // We don't store 'mode' globally in storage anymore for the UI state, 
    // we rely on the injected script state.
    // chrome.storage.local.set({ mode: mode }); 
    updateModeUI(mode);

    let action = 'reset';
    if (mode === 'simplify') action = 'enable_simplify';
    if (mode === 'focus') action = 'enable_focus';

    sendMessageToCurrentTab(action, () => {
      setTimeout(refreshStatus, 50);
    });
  }

  btnSummarize.addEventListener('click', () => {
    summaryContainer.innerHTML = '<div class="empty-state"><p>Analyzing...</p></div>';
    sendMessageToCurrentTab('summarize', (response) => {
      if (chrome.runtime.lastError || !response || !response.summary) {
        summaryContainer.innerHTML = '<div class="empty-state"><p>Analysis failed.</p></div>';
        return;
      }
      // Handle array or string
      let summaryHtml = '';
      if (Array.isArray(response.summary)) {
        summaryHtml = `<ul>${response.summary.map(s => `<li>${s}</li>`).join('')}</ul>`;
      } else {
        summaryHtml = `<p>${response.summary}</p>`;
      }
      summaryContainer.innerHTML = summaryHtml;

      // Show actions
      const actions = document.getElementById('summary-actions');
      if (actions) actions.classList.remove('hidden');

      // chrome.storage.local.set({ summary: summaryHtml }); // Don't persist summary globally for side panel, it's per page
    });
  });

  const btnCopy = document.getElementById('btn-copy-summary');
  const btnClear = document.getElementById('btn-clear-summary');

  if (btnCopy) {
    btnCopy.addEventListener('click', () => {
      const text = summaryContainer.innerText;
      navigator.clipboard.writeText(text).then(() => {
        const original = btnCopy.innerText;
        btnCopy.innerText = '✅';
        setTimeout(() => btnCopy.innerText = original, 1500);
      });
    });
  }

  if (btnClear) {
    btnClear.addEventListener('click', () => {
      summaryContainer.innerHTML = '<div class="empty-state"><span class="icon">✨</span><p>Click \'Generate\' to analyze page</p></div>';
      document.getElementById('summary-actions').classList.add('hidden');
    });
  }

  // Settings Logic
  btnSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
    loadVoices(); // Refresh voices when opening settings
  });

  const voiceSelect = document.getElementById('voice-select');

  function loadVoices() {
    const voices = window.speechSynthesis.getVoices();

    // Clear existing (except Auto)
    voiceSelect.innerHTML = '<option value="auto">Auto (Best Match)</option>';

    // Filter for English or relevant voices and sort
    const relevantVoices = voices.filter(v => v.lang.startsWith('en')).sort((a, b) => a.name.localeCompare(b.name));

    relevantVoices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

    // Restore selection
    chrome.storage.local.get(['preferredVoice'], (result) => {
      if (result.preferredVoice) {
        voiceSelect.value = result.preferredVoice;
      }
    });
  }

  // Handle Chrome's async voice loading
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  voiceSelect.addEventListener('change', () => {
    const selectedVoice = voiceSelect.value;
    chrome.storage.local.set({ preferredVoice: selectedVoice });
    // Optional: Preview voice?
  });

  btnCloseSettings.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  btnSaveSettings.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    chrome.storage.sync.set({ geminiApiKey: key }, () => {
      settingsStatus.textContent = "Saved!";
      setTimeout(() => settingsStatus.textContent = "", 2000);
    });
  });

  // ========== CHAT WITH PAGE ==========
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');
  let pageContext = ''; // Cached page content

  // Get page context on load
  async function loadPageContext() {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action: 'get_page_content' }, (response) => {
      if (response && response.content) {
        pageContext = response.content;
      }
    });
  }

  // Chat functions
  function addChatBubble(text, type) {
    // Remove welcome message if present
    const welcome = chatMessages.querySelector('.chat-welcome');
    if (welcome) welcome.remove();

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${type}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  async function sendChatMessage(question) {
    if (!question.trim()) return;

    addChatBubble(question, 'user');
    chatInput.value = '';

    const loadingBubble = addChatBubble('Thinking...', 'loading');

    // Load page context if not loaded
    if (!pageContext) await loadPageContext();

    chrome.runtime.sendMessage({
      action: 'chat_with_api',
      question: question,
      context: pageContext
    }, (response) => {
      loadingBubble.remove();
      if (response.error) {
        addChatBubble(`Error: ${response.error}`, 'ai');
      } else {
        addChatBubble(response.answer, 'ai');
      }
    });
  }

  btnSendChat.addEventListener('click', () => {
    sendChatMessage(chatInput.value);
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(chatInput.value);
    }
  });

  // Listen for explain_selection from context menu
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'explain_selection') {
      const question = `Explain this: "${request.text}"`;
      sendChatMessage(question);
    }
  });

  // Load context when tab changes
  chrome.tabs.onActivated.addListener(() => {
    updateActiveTab();
    pageContext = '';
    loadPageContext();
  });
});
