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

  // Initial Data Load
  chrome.storage.local.get(['mode', 'summary', 'dyslexiaFont', 'theme'], (result) => {
    updateModeUI(result.mode || 'none');

    if (result.summary) summaryContainer.innerHTML = result.summary;
    if (result.dyslexiaFont) checkDyslexia.checked = true;

    const currentTheme = result.theme || 'light';
    updateThemeUI(currentTheme);
  });

  // Listen for storage changes (Sync from Toolbar)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.theme) {
        updateThemeUI(changes.theme.newValue);
      }
      if (changes.mode) {
        updateModeUI(changes.mode.newValue);
      }
    }
  });

  // Real-time Status Check
  refreshStatus();
  setInterval(refreshStatus, 2000); // Poll every 2s to keep stats fresh

  function refreshStatus() {
    sendMessageToActiveTab('get_status', (response) => {
      if (chrome.runtime.lastError || !response) {
        connectionStatus.classList.remove('connected');
        statusText.textContent = "Disconnected";
        liveStats.classList.add('hidden');
        return;
      }

      // Update Connection UI
      connectionStatus.classList.add('connected');
      statusText.textContent = "Live Protection";

      // Update Stats
      if (response.mode !== 'none') {
        liveStats.classList.remove('hidden');
        // Animate count if changed
        if (distractionCount.innerText != response.hiddenCount) {
          distractionCount.innerText = response.hiddenCount;
          distractionCount.style.transform = 'scale(1.2)';
          setTimeout(() => distractionCount.style.transform = 'scale(1)', 200);
        }
        activeMode.innerText = response.mode.charAt(0).toUpperCase() + response.mode.slice(1);
      } else {
        liveStats.classList.add('hidden');
      }

      // Sync Mode UI in case it changed externally
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
    // Update Popup Body Theme
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    // Update Active Button
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
      sendMessageToActiveTab(isEnabled ? 'enable_dyslexia' : 'disable_dyslexia');
    });
  }

  if (themeBtns) {
    themeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.dataset.theme;
        updateThemeUI(theme);
        chrome.storage.local.set({ theme: theme });
        sendMessageToActiveTab(`set_theme_${theme}`);
      });
    });
  }

  function sendMessageToActiveTab(action, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) return;
      chrome.tabs.sendMessage(tabs[0].id, { action: action }, (response) => {
        if (callback) callback(response);
      });
    });
  }

  btnSimplify.addEventListener('click', () => {
    const isActive = btnSimplify.classList.contains('active');
    // If active, we are turning it off (none). If inactive, we turn it on (simplify).
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
    chrome.storage.local.set({ mode: mode });
    updateModeUI(mode);

    let action = 'reset';
    if (mode === 'simplify') action = 'enable_simplify';
    if (mode === 'focus') action = 'enable_focus';

    sendMessageToActiveTab(action, () => {
      setTimeout(refreshStatus, 100); // Immediate refresh
    });
  }

  btnSummarize.addEventListener('click', () => {
    summaryContainer.innerHTML = '<div class="empty-state"><p>Analyzing...</p></div>';
    sendMessageToActiveTab('summarize', (response) => {
      if (chrome.runtime.lastError || !response || !response.summary) {
        summaryContainer.innerHTML = '<div class="empty-state"><p>Analysis failed.</p></div>';
        return;
      }
      const summaryHtml = `<ul>${response.summary.map(s => `<li>${s}</li>`).join('')}</ul>`;
      summaryContainer.innerHTML = summaryHtml;
      chrome.storage.local.set({ summary: summaryHtml });
    });
  });
});
