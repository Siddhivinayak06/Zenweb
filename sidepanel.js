/**
 * ZenWeb Sidepanel - Simplified Controller
 */
document.addEventListener('DOMContentLoaded', () => {
  // Quick Action Buttons
  const btnSimplify = document.getElementById('btn-simplify');
  const btnFocus = document.getElementById('btn-focus');
  const btnReset = document.getElementById('btn-reset');
  const btnSummarize = document.getElementById('btn-summarize');

  // Status Elements
  const connectionStatus = document.getElementById('connection-status');
  const liveStats = document.getElementById('live-stats');
  const distractionCount = document.getElementById('distraction-count');
  const activeMode = document.getElementById('active-mode');

  // Settings Elements
  const btnSettings = document.getElementById('btn-settings');
  const settingsPanel = document.getElementById('settings-panel');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const apiKeyInput = document.getElementById('api-key-input');
  const settingsStatus = document.getElementById('settings-status');

  // Profile Elements
  const profileChips = document.querySelectorAll('.profile-chip');
  const btnClearProfile = document.getElementById('btn-clear-profile');

  // Appearance Elements
  const checkDyslexia = document.getElementById('check-dyslexia');
  const checkAdBlocker = document.getElementById('check-adblocker');
  const adsHiddenBadge = document.getElementById('ads-hidden-badge');
  const themeChips = document.querySelectorAll('.theme-chip');

  // Score Elements
  const scoreStrip = document.getElementById('score-strip');
  const scoreEmoji = document.getElementById('score-emoji');
  const scoreValue = document.getElementById('score-value');
  const scoreLabel = document.getElementById('score-label');
  const btnRefreshScore = document.getElementById('btn-refresh-score');

  // Summary Elements
  const summaryContainer = document.getElementById('summary-container');
  const summarySection = document.getElementById('summary-section');
  const summaryActions = document.getElementById('summary-actions');
  const btnCopySummary = document.getElementById('btn-copy-summary');
  const btnClearSummary = document.getElementById('btn-clear-summary');

  // Chat Elements
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');

  // Dashboard
  const btnDashboard = document.getElementById('btn-dashboard');

  // State
  let currentTabId = null;
  let currentActiveProfile = null;

  // ========================================
  // INITIALIZATION
  // ========================================

  async function init() {
    await updateActiveTab();
    loadPreferences();
    setInterval(refreshStatus, 2000);
  }

  async function updateActiveTab() {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      currentTabId = tabs[0].id;
      const url = tabs[0].url || '';
      const isRestricted = url.startsWith('chrome://') ||
        url.startsWith('edge://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('about:') || url === '';

      if (isRestricted) {
        connectionStatus.classList.remove('connected');
        updateScoreUI({ restricted: true });
        return;
      }

      connectionStatus.classList.add('connected');
      refreshStatus();
      loadCognitiveScore();
    }
  }

  function loadPreferences() {
    // Load API Key
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
      if (result.geminiApiKey) apiKeyInput.value = result.geminiApiKey;
    });

    // Load profile
    chrome.storage.sync.get(['activeProfile'], (result) => {
      currentActiveProfile = result.activeProfile || null;
      updateProfileUI(currentActiveProfile);
    });

    // Load dyslexia font
    chrome.storage.local.get(['dyslexiaFont', 'theme', 'adBlockerEnabled'], (result) => {
      if (checkDyslexia) checkDyslexia.checked = !!result.dyslexiaFont;
      if (checkAdBlocker) checkAdBlocker.checked = result.adBlockerEnabled !== false;
      updateThemeUI(result.theme || 'light');
    });
  }

  // ========================================
  // MESSAGING
  // ========================================

  function sendMessage(action, data = {}, callback) {
    if (!currentTabId) return;
    chrome.tabs.sendMessage(currentTabId, { action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        console.log('ZenWeb: Message error -', chrome.runtime.lastError.message);
        return;
      }
      if (callback) callback(response);
    });
  }

  // ========================================
  // STATUS REFRESH
  // ========================================

  function refreshStatus() {
    sendMessage('get_status', {}, (response) => {
      if (!response) return;

      // Update mode UI
      updateModeUI(response.mode);

      // Update ad blocker status
      sendMessage('get_adblocker_status', {}, (adResponse) => {
        if (adResponse) {
          if (checkAdBlocker) checkAdBlocker.checked = adResponse.enabled;
          if (adResponse.enabled && adResponse.hiddenCount > 0) {
            adsHiddenBadge.textContent = adResponse.hiddenCount;
            adsHiddenBadge.classList.remove('hidden');
          } else {
            adsHiddenBadge.classList.add('hidden');
          }
        }
      });
    });
  }

  function updateModeUI(mode) {
    btnSimplify.classList.toggle('active', mode === 'simplify');
    btnFocus.classList.toggle('active', mode === 'focus');
  }

  // ========================================
  // COGNITIVE SCORE
  // ========================================

  function loadCognitiveScore() {
    sendMessage('get_cognitive_score', {}, updateScoreUI);
  }

  function updateScoreUI(data) {
    if (!data || data.restricted) {
      scoreEmoji.textContent = '🚫';
      scoreValue.textContent = 'N/A';
      scoreLabel.textContent = 'Not available';
      scoreStrip.className = 'score-strip';
      return;
    }

    if (!data.score && data.score !== 0) {
      scoreEmoji.textContent = '⏳';
      scoreValue.textContent = '--';
      scoreLabel.textContent = 'Calculating...';
      scoreStrip.className = 'score-strip';
      return;
    }

    const { score, level } = data;
    scoreEmoji.textContent = level?.emoji || '📊';
    scoreValue.textContent = score;
    scoreLabel.textContent = level?.label || 'Page Load Score';
    scoreStrip.className = `score-strip ${level?.level || ''}`;
  }

  btnRefreshScore?.addEventListener('click', () => {
    scoreEmoji.textContent = '⏳';
    scoreValue.textContent = '...';
    sendMessage('recalculate_cognitive_score', {}, updateScoreUI);
  });

  // ========================================
  // QUICK ACTIONS
  // ========================================

  btnSimplify?.addEventListener('click', () => {
    sendMessage('toggle_simplify', {}, () => refreshStatus());
  });

  btnFocus?.addEventListener('click', () => {
    sendMessage('toggle_focus', {}, () => refreshStatus());
  });

  btnReset?.addEventListener('click', () => {
    sendMessage('reset', {}, () => refreshStatus());
  });

  // ========================================
  // PROFILES
  // ========================================

  function updateProfileUI(profileId) {
    profileChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.profile === profileId);
    });
    btnClearProfile?.classList.toggle('hidden', !profileId);

    // Show/Hide Edit Custom button
    if (profileId === 'custom') {
      btnEditCustom?.classList.remove('hidden');
    } else {
      btnEditCustom?.classList.add('hidden');
      customEditor?.classList.add('hidden');
    }
  }

  profileChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const profileId = chip.dataset.profile;
      if (profileId === currentActiveProfile) {
        clearProfile();
      } else {
        setProfile(profileId);
      }
    });
  });

  function setProfile(profileId) {
    sendMessage('set_profile', { profileId }, () => {
      currentActiveProfile = profileId;
      updateProfileUI(profileId);
    });
  }

  function clearProfile() {
    sendMessage('clear_profile', {}, () => {
      currentActiveProfile = null;
      updateProfileUI(null);
    });
  }

  btnClearProfile?.addEventListener('click', clearProfile);

  // ========================================
  // CUSTOM PROFILE EDITOR LOGIC
  // ========================================
  const btnEditCustom = document.getElementById('btn-edit-custom-profile');
  const customEditor = document.getElementById('custom-profile-editor');
  const btnCloseCustom = document.getElementById('btn-close-custom');
  const btnSaveCustom = document.getElementById('btn-save-custom');

  // Controls
  const inputFontSize = document.getElementById('custom-font-size');
  const inputLineSpacing = document.getElementById('custom-line-spacing');
  const inputWordSpacing = document.getElementById('custom-word-spacing');
  const inputCustomDyslexia = document.getElementById('custom-dyslexia');

  // Value Labels
  const valFontSize = document.getElementById('val-font-size');
  const valLineSpacing = document.getElementById('val-line-spacing');
  const valWordSpacing = document.getElementById('val-word-spacing');

  // Events for Sliders
  inputFontSize?.addEventListener('input', (e) => valFontSize.textContent = `${e.target.value}px`);
  inputLineSpacing?.addEventListener('input', (e) => valLineSpacing.textContent = e.target.value);
  inputWordSpacing?.addEventListener('input', (e) => valWordSpacing.textContent = `${e.target.value}em`);

  btnEditCustom?.addEventListener('click', () => {
    // Load current settings
    chrome.storage.sync.get(['customProfileSettings'], (result) => {
      const settings = result.customProfileSettings || {};
      if (settings.fontSize) { inputFontSize.value = settings.fontSize; valFontSize.textContent = `${settings.fontSize}px`; }
      if (settings.lineSpacing) { inputLineSpacing.value = settings.lineSpacing; valLineSpacing.textContent = settings.lineSpacing; }
      if (settings.wordSpacing) { inputWordSpacing.value = settings.wordSpacing; valWordSpacing.textContent = `${settings.wordSpacing}em`; }
      if (settings.useDyslexiaFont) { inputCustomDyslexia.checked = settings.useDyslexiaFont; }
    });
    customEditor.classList.remove('hidden');
    btnEditCustom.classList.add('hidden');
  });

  btnCloseCustom?.addEventListener('click', () => {
    customEditor.classList.add('hidden');
    if (currentActiveProfile === 'custom') {
      btnEditCustom.classList.remove('hidden');
    }
  });

  btnSaveCustom?.addEventListener('click', () => {
    const settings = {
      fontSize: parseInt(inputFontSize.value),
      lineSpacing: parseFloat(inputLineSpacing.value),
      wordSpacing: parseFloat(inputWordSpacing.value),
      useDyslexiaFont: inputCustomDyslexia.checked
    };

    sendMessage('update_custom_profile', { settings }, () => {
      // Visual feedback
      const originalText = btnSaveCustom.textContent;
      btnSaveCustom.textContent = '✓ Applied!';
      btnSaveCustom.style.background = 'var(--success-color)';
      setTimeout(() => {
        btnSaveCustom.textContent = originalText;
        btnSaveCustom.style.background = '';
        customEditor.classList.add('hidden');
        btnEditCustom.classList.remove('hidden');
      }, 1000);
    });
  });


  // ========================================
  // APPEARANCE
  // ========================================

  checkDyslexia?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ dyslexiaFont: enabled });
    sendMessage(enabled ? 'enable_dyslexia' : 'disable_dyslexia');
  });

  checkAdBlocker?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ adBlockerEnabled: enabled });
    sendMessage(enabled ? 'enable_adblocker' : 'disable_adblocker', {}, (response) => {
      if (response?.hiddenCount > 0) {
        adsHiddenBadge.textContent = response.hiddenCount;
        adsHiddenBadge.classList.remove('hidden');
      } else {
        adsHiddenBadge.classList.add('hidden');
      }
    });
  });

  function updateThemeUI(theme) {
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    themeChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.theme === theme);
    });
  }

  themeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const theme = chip.dataset.theme;
      chrome.storage.local.set({ theme });
      updateThemeUI(theme);
      sendMessage(`set_theme_${theme}`);
    });
  });

  // ========================================
  // SETTINGS
  // ========================================

  btnSettings?.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
  });

  btnCloseSettings?.addEventListener('click', () => {
    settingsPanel.classList.add('hidden');
  });

  btnSaveSettings?.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
        settingsStatus.textContent = '✓ Saved!';
        settingsStatus.style.color = '#10b981';
        setTimeout(() => settingsStatus.textContent = '', 2000);
      });
    }
  });

  // ========================================
  // AI SUMMARY
  // ========================================

  btnSummarize?.addEventListener('click', async () => {
    summaryContainer.innerHTML = '<p class="summary-placeholder">⏳ Generating summary...</p>';
    summarySection.open = true;

    sendMessage('summarize', {}, (response) => {
      if (!response) {
        summaryContainer.innerHTML = '<p class="summary-placeholder">❌ Could not generate summary</p>';
        return;
      }

      if (response.summary) {
        summaryContainer.innerHTML = `<div class="summary-text">${formatSummary(response.summary)}</div>`;
        summaryActions.classList.remove('hidden');
      } else if (response.error) {
        summaryContainer.innerHTML = `<p class="summary-placeholder">❌ ${response.error}</p>`;
      }
    });
  });

  function formatSummary(text) {
    // 1. Handle non-string inputs (e.g. pure JSON objects)
    if (typeof text !== 'string') {
      if (Array.isArray(text)) {
        return '<ul>' + text.map(item => `<li>${String(item).replace(/^[-•]\s*/, '')}</li>`).join('') + '</ul>';
      }
      try {
        text = JSON.stringify(text, null, 2);
      } catch (e) {
        text = String(text);
      }
    }

    // 2. Handle String inputs
    // Check if it's a JSON string representation of an array
    if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          return '<ul>' + parsed.map(item => `<li>${String(item).replace(/^[-•]\s*/, '')}</li>`).join('') + '</ul>';
        }
      } catch (e) {
        // Not valid JSON, continue to normal text processing
      }
    }

    // Convert bullet points to list
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0 && lines.every(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./))) {
      return '<ul>' + lines.map(l => `<li>${l.replace(/^[-•]\s*|^\d+\.\s*/, '')}</li>`).join('') + '</ul>';
    }
    return `<p>${text.replace(/\n/g, '<br>')}</p>`;
  }


  btnCopySummary?.addEventListener('click', () => {
    const text = summaryContainer.innerText;
    navigator.clipboard.writeText(text);
  });

  btnClearSummary?.addEventListener('click', () => {
    summaryContainer.innerHTML = '<p class="summary-placeholder">Click "Summarize" above to analyze this page</p>';
    summaryActions.classList.add('hidden');
  });

  // ========================================
  // CHAT
  // ========================================

  async function sendChatMessage() {
    const question = chatInput.value.trim();
    if (!question) return;

    // Clear placeholder and add user message
    if (chatMessages.querySelector('.chat-placeholder')) {
      chatMessages.innerHTML = '';
    }

    addChatBubble(question, 'user');
    chatInput.value = '';

    // Add loading indicator
    const loadingId = addChatBubble('Thinking...', 'loading');

    try {
      const apiKey = await new Promise(resolve => {
        chrome.storage.sync.get(['geminiApiKey'], r => resolve(r.geminiApiKey));
      });

      if (!apiKey) {
        removeChatBubble(loadingId);
        addChatBubble('Please add your Gemini API key in settings.', 'ai');
        return;
      }

      // Get page content
      const pageContent = await new Promise(resolve => {
        sendMessage('get_page_content', {}, r => resolve(r?.content || ''));
      });

      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Based on this webpage content, answer the question concisely.\n\nPage Content:\n${pageContent.substring(0, 8000)}\n\nQuestion: ${question}`
            }]
          }]
        })
      });

      const data = await response.json();
      removeChatBubble(loadingId);

      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        addChatBubble(data.candidates[0].content.parts[0].text, 'ai');
      } else {
        addChatBubble('Sorry, I couldn\'t generate a response.', 'ai');
      }
    } catch (error) {
      removeChatBubble(loadingId);
      addChatBubble('Error: ' + error.message, 'ai');
    }
  }

  function addChatBubble(text, type) {
    const id = 'bubble-' + Date.now();
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.className = `chat-bubble ${type}`;
    bubble.textContent = text;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  function removeChatBubble(id) {
    document.getElementById(id)?.remove();
  }

  btnSendChat?.addEventListener('click', sendChatMessage);
  chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // ========================================
  // DASHBOARD
  // ========================================

  btnDashboard?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') });
  });

  // ========================================
  // TAB CHANGE LISTENERS
  // ========================================

  chrome.tabs.onActivated.addListener(updateActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === currentTabId && changeInfo.status === 'complete') {
      refreshStatus();
      loadCognitiveScore();
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.activeProfile) {
      currentActiveProfile = changes.activeProfile.newValue || null;
      updateProfileUI(currentActiveProfile);
    }
    if (namespace === 'local') {
      if (changes.theme) updateThemeUI(changes.theme.newValue);
      if (changes.dyslexiaFont && checkDyslexia) {
        checkDyslexia.checked = !!changes.dyslexiaFont.newValue;
      }
    }
  });

  // Initialize
  init();
});
