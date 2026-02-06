/**
 * ZenWeb Sidepanel - Simplified Controller
 */
import { actionExtractor } from './modules/action-extractor.js';

document.addEventListener('DOMContentLoaded', () => {
  // Quick Action Buttons
  const btnSimplify = document.getElementById('btn-simplify');
  const btnFocus = document.getElementById('btn-focus');
  const btnPause = document.getElementById('btn-pause');
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
  const checkBionic = document.getElementById('check-bionic');
  const checkAdBlocker = document.getElementById('check-adblocker');
  const adsHiddenBadge = document.getElementById('ads-hidden-badge');
  const themeChips = document.querySelectorAll('.theme-chip');

  // Score Elements
  const scoreStrip = document.getElementById('score-strip');
  const scoreEmoji = document.getElementById('score-emoji');
  const scoreValue = document.getElementById('score-value');
  const scoreLabel = document.getElementById('score-label');
  const btnRefreshScore = document.getElementById('btn-refresh-score');

  // ...

  function updateScoreUI(data) {
    if (!data || data.restricted) {
      if (scoreEmoji) scoreEmoji.textContent = '🚫';
      if (scoreValue) scoreValue.textContent = 'N/A';
      if (scoreLabel) scoreLabel.textContent = 'Not available';
      if (scoreStrip) scoreStrip.className = 'score-strip';
      return;
    }

    if (!data.score && data.score !== 0) {
      if (scoreEmoji) scoreEmoji.textContent = '⏳';
      if (scoreValue) scoreValue.textContent = '--';
      if (scoreLabel) scoreLabel.textContent = 'Calculating...';
      if (scoreStrip) scoreStrip.className = 'score-strip';
      return;
    }

    const { score, level } = data;

    // Set Emoji & Text
    if (scoreEmoji) scoreEmoji.textContent = level?.emoji || '📊';
    if (scoreValue) scoreValue.textContent = score;
    if (scoreLabel) scoreLabel.textContent = level?.label || 'Page Score';

    // Set Strip Class for Color
    // CSS expects: .score-strip.low, .medium, .high
    // Assuming low score = "low" load (Green)?? Or "Low" performance (Red)?
    // User CSS: .low { green }, .medium { amber }, .high { red }
    // If "Page Load Score" (Speed): 100 is green. 0 is red.
    // If "Cognitive Load Score": 0 is green (low load). 100 is red (high load).
    // Let's assume Cognitive Load (Low is Good).

    let stripClass = 'high'; // Default red
    if (score < 50) stripClass = 'low'; // Green
    else if (score < 80) stripClass = 'medium'; // Amber

    if (scoreStrip) scoreStrip.className = `score-strip ${stripClass}`;
  }

  btnRefreshScore?.addEventListener('click', () => {
    if (scoreEmoji) scoreEmoji.textContent = '⏳';
    if (scoreValue) scoreValue.textContent = '...';
    sendMessage('recalculate_cognitive_score', {}, updateScoreUI);
  });

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
  let extractedActions = []; // Store for copy/export

  // ========================================
  // ACTION EXTRACTOR (PRO)
  // ========================================
  const btnActions = document.getElementById('btn-actions');
  const actionPanel = document.getElementById('action-panel');
  const btnCloseActions = document.getElementById('btn-close-actions');
  const actionListContainer = document.getElementById('action-list-container');
  const btnCopyActions = document.getElementById('btn-copy-actions');
  const btnExportActions = document.getElementById('btn-export-actions');

  // Toggle Panel with Paywall Check
  btnActions?.addEventListener('click', () => {
    actionPanel.classList.remove('hidden');
    actionListContainer.innerHTML = '<div class="action-empty-state"><p>Checking subscription...</p></div>';

    // Check Pro Status
    sendMessage('get_subscription_status', {}, (status) => {
      if (status && status.isPro) {
        scanForActions();
        btnExportActions.style.display = 'block';
      } else {
        renderPaywall();
        btnExportActions.style.display = 'none';
      }
    });
  });

  btnCloseActions?.addEventListener('click', () => {
    actionPanel.classList.add('hidden');
  });

  function renderPaywall() {
    actionListContainer.innerHTML = `
        <div class="action-empty-state" style="padding: 30px 20px;">
            <div style="font-size: 40px; margin-bottom: 20px;">🔒</div>
            <h3 style="margin-bottom: 10px; color: var(--text-primary);">Pro Feature</h3>
            <p style="margin-bottom: 20px; font-size: 14px;">Upgrade to Context+ to automatically extract tasks, deadlines, and export them to your calendar.</p>
            <button id="btn-upgrade-trigger" class="action-btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">Upgrade for $4.99/mo</button>
            <p style="margin-top: 15px; font-size: 12px; color: var(--text-muted);">
                <a href="#" id="link-simulate-pro" style="color: var(--accent-primary);">Dev: Simulate Upgrade</a>
            </p>
        </div>
      `;


    // Connect Upgrade Button
    document.getElementById('btn-upgrade-trigger')?.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('pricing.html') });
    });

    // Dev backdoor
    document.getElementById('link-simulate-pro')?.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage('simulate_upgrade', {}, () => {
        btnActions.click(); // Reload
      });
    });
  }

  function scanForActions() {
    actionListContainer.innerHTML = '<div class="action-empty-state"><p>Scanning page for tasks...</p></div>';

    // Get text from page
    sendMessage('get_page_content', {}, (response) => {
      if (response && response.content) {
        extractedActions = actionExtractor.scan(response.content);
        renderActions(extractedActions);
      } else {
        actionListContainer.innerHTML = '<div class="action-empty-state"><p>Could not read page content.</p></div>';
      }
    });
  }

  function renderActions(actions) {
    if (actions.length === 0) {
      actionListContainer.innerHTML = '<div class="action-empty-state"><p>No specific action items found.</p></div>';
      return;
    }

    actionListContainer.innerHTML = '';
    actions.forEach(action => {
      const item = document.createElement('div');
      item.className = 'action-item';
      if (action.priority === 'high') item.classList.add('priority-high');

      const dateBadge = action.dates && action.dates.length ? `<span class="date-badge">📅 ${action.dates[0]}</span>` : '';
      const priorityBadge = action.priority === 'high' ? `<span class="priority-badge">🔥 High</span>` : '';

      item.innerHTML = `
      <input type="checkbox" class="action-checkbox">
        <div class="action-details">
          <div class="action-text">${action.text}</div>
          <div class="action-meta">
            ${dateBadge}
            ${priorityBadge}
          </div>
        </div>
    `;

      item.querySelector('input')?.addEventListener('change', (e) => {
        item.classList.toggle('checked', e.target.checked);
      });

      actionListContainer.appendChild(item);
    });
  }

  btnCopyActions?.addEventListener('click', () => {
    const items = Array.from(actionListContainer.querySelectorAll('.action-item:not(.checked) .action-text')).map(el => '- [ ] ' + el.textContent);
    if (items.length === 0) return;

    navigator.clipboard.writeText(items.join('\n'));

    const originalText = btnCopyActions.innerText;
    btnCopyActions.textContent = '✓ Copied!';
    setTimeout(() => btnCopyActions.textContent = originalText, 2000);
  });

  btnExportActions?.addEventListener('click', () => {
    const pendingTasks = extractedActions.filter((_, i) => !document.querySelectorAll('.action-item')[i]?.classList.contains('checked'));
    if (pendingTasks.length === 0) return;

    const originalText = btnExportActions.innerText;
    btnExportActions.textContent = 'Exporting...';

    actionExtractor.exportToService('Todoist', pendingTasks).then(res => {
      btnExportActions.textContent = `✓ Sent ${res.count} tasks`;
      setTimeout(() => btnExportActions.textContent = originalText, 2000);
    });
  });

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

    // Load dyslexia font, bionic reading, and other settings
    chrome.storage.local.get(['dyslexiaFont', 'bionicReading', 'theme', 'adBlockerEnabled'], (result) => {
      if (checkDyslexia) checkDyslexia.checked = !!result.dyslexiaFont;
      if (checkBionic) checkBionic.checked = !!result.bionicReading;
      if (checkAdBlocker) checkAdBlocker.checked = result.adBlockerEnabled !== false;
      updateThemeUI(result.theme || 'light');
    });
  }

  // ========================================
  // MESSAGING
  // ========================================

  function sendMessage(action, data = {}, callback) {
    const runtimeActions = [
      'login', 'signup', 'logout', 'get_user_status',
      'check_usage_limit', 'simulate_upgrade', 'open_pricing',
      'summarize_with_api', 'chat_with_api'
    ];

    if (runtimeActions.includes(action)) {
      chrome.runtime.sendMessage({ action, ...data }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("ZenWeb: Runtime message error", chrome.runtime.lastError);
          if (callback) callback({ error: { message: "Connection to background failed. Reload extension." } });
        } else {
          if (callback) callback(response);
        }
      });
      return;
    }

    if (!currentTabId) {
      if (callback) callback({ error: { message: "No active tab" } });
      return;
    }
    chrome.tabs.sendMessage(currentTabId, { action, ...data }, (response) => {
      if (chrome.runtime.lastError) {
        // This often happens if content script isn't loaded yet
        console.log('ZenWeb: Tab message error -', chrome.runtime.lastError.message);
        if (callback) callback({ error: { message: "Connection to page failed. Try reloading the page." } });
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
      updateModeUI(response.mode, response);

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

  function updateModeUI(mode, response) {
    // Support both modes being active simultaneously
    const simplifyOn = response?.simplifyActive || mode === 'simplify' || mode === 'both';
    const focusOn = response?.focusActive || mode === 'focus' || mode === 'both';
    btnSimplify.classList.toggle('active', simplifyOn);
    btnFocus.classList.toggle('active', focusOn);
  }

  // ========================================
  // COGNITIVE SCORE
  // ========================================

  function loadCognitiveScore() {
    sendMessage('get_cognitive_score', {}, updateScoreUI);
  }

  function updateScoreUI(data) {
    const scoreRing = document.getElementById('score-ring');
    const scoreValText = document.getElementById('score-value');
    const scoreLabelText = document.getElementById('score-label');

    if (!data || data.restricted) {
      if (scoreRing) scoreRing.style.background = 'conic-gradient(#cbd5e1 100%, transparent 100%)';
      if (scoreValText) scoreValText.textContent = '--';
      if (scoreLabelText) scoreLabelText.textContent = 'Not available';
      return;
    }

    if (!data.score && data.score !== 0) {
      if (scoreRing) scoreRing.style.background = 'conic-gradient(#fbbf24 100%, transparent 100%)';
      if (scoreValText) scoreValText.textContent = '--';
      if (scoreLabelText) scoreLabelText.textContent = 'Calculating...';
      /* Add spin class? Maybe later */
      return;
    }

    const { score, level } = data;

    // Determine Color
    let color = '#ef4444'; // Red
    if (score > 80) color = '#10b981'; // Green
    else if (score > 50) color = '#f59e0b'; // Orange

    // Update Ring Gradient
    // "score" is 0-100. We want the filled part to be "score%".
    // conic-gradient(color score%, transparent 0)
    if (scoreRing) {
      scoreRing.style.background = `conic-gradient(${color} ${score}%, #e2e8f0 0)`;
    }

    if (scoreValText) {
      scoreValText.textContent = score;
      scoreValText.style.color = 'var(--text-main)'; // Keep text clean dark, or match color? Let's match color for impact.
      scoreValText.style.color = color;
    }

    if (scoreLabelText) scoreLabelText.textContent = level?.label || 'Load Score';
  }

  btnRefreshScore?.addEventListener('click', () => {
    // Show spinner state
    const scoreRing = document.getElementById('score-ring');
    if (scoreRing) scoreRing.style.background = 'conic-gradient(#e2e8f0 100%, transparent 0)';
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

  btnPause?.addEventListener('click', () => {
    sendMessage('toggle_pause', {}, (response) => {
      if (response && response.paused) {
        btnPause.classList.add('active');
        btnPause.querySelector('.quick-label').textContent = 'Resume';
      } else {
        btnPause.classList.remove('active');
        btnPause.querySelector('.quick-label').textContent = 'Pause';
      }
    });
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
  inputFontSize?.addEventListener('input', (e) => valFontSize.textContent = `${e.target.value} px`);
  inputLineSpacing?.addEventListener('input', (e) => valLineSpacing.textContent = e.target.value);
  inputWordSpacing?.addEventListener('input', (e) => valWordSpacing.textContent = `${e.target.value} em`);

  btnEditCustom?.addEventListener('click', () => {
    // Load current settings
    chrome.storage.sync.get(['customProfileSettings'], (result) => {
      const settings = result.customProfileSettings || {};
      if (settings.fontSize) { inputFontSize.value = settings.fontSize; valFontSize.textContent = `${settings.fontSize} px`; }
      if (settings.lineSpacing) { inputLineSpacing.value = settings.lineSpacing; valLineSpacing.textContent = settings.lineSpacing; }
      if (settings.wordSpacing) { inputWordSpacing.value = settings.wordSpacing; valWordSpacing.textContent = `${settings.wordSpacing} em`; }
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

  checkBionic?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    chrome.storage.local.set({ bionicReading: enabled });
    sendMessage(enabled ? 'enable_bionic' : 'disable_bionic');
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
      chrome.storage.local.set({ theme });
      updateThemeUI(theme);
      sendMessage(`set_theme_${theme} `);
    });
  });

  // ========================================
  // SETTINGS
  // ========================================

  // ========================================
  // SETTINGS & AUTH
  // ========================================

  btnSettings?.addEventListener('click', () => {
    settingsPanel.classList.remove('hidden');
    refreshAuthUI();
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

  // Auth Elements
  const authSection = document.getElementById('user-account-section');
  const loggedOutView = document.getElementById('user-logged-out');
  const loggedInView = document.getElementById('user-logged-in');
  const emailInput = document.getElementById('auth-email-input');
  const passwordInput = document.getElementById('auth-password-input');
  const btnLogin = document.getElementById('btn-login');
  const btnToggleAuthMode = document.getElementById('btn-toggle-auth-mode');
  const authErrorMsg = document.getElementById('auth-error-msg');

  const btnLogout = document.getElementById('btn-logout');
  const btnUpgradeAccount = document.getElementById('btn-upgrade-account');
  const userName = document.getElementById('user-name');
  const userAvatar = document.getElementById('user-avatar');
  const userPlanBadge = document.getElementById('user-plan-badge');

  let isSignupMode = false;

  function refreshAuthUI(callback) {
    sendMessage('get_user_status', {}, (user) => {
      if (user) {
        loggedOutView.classList.add('hidden');
        loggedInView.classList.remove('hidden');
        userName.textContent = user.name || user.email;
        userAvatar.src = user.avatar;
        userPlanBadge.textContent = user.plan.toUpperCase();
        userPlanBadge.style.background = user.plan === 'pro' ? '#6366f1' : '#64748b';

        if (user.plan === 'pro') {
          btnUpgradeAccount.classList.add('hidden');
        } else {
          btnUpgradeAccount.classList.remove('hidden');
        }
      } else {
        loggedOutView.classList.remove('hidden');
        loggedInView.classList.add('hidden');
        // We generally clear messages, but callback might override
        if (authErrorMsg) authErrorMsg.textContent = '';
        if (passwordInput) passwordInput.value = '';
      }
      if (callback) callback(user);
    });
  }

  btnToggleAuthMode?.addEventListener('click', (e) => {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    if (isSignupMode) {
      btnLogin.textContent = 'Sign Up';
      btnToggleAuthMode.textContent = 'Have an account? Sign In';
    } else {
      btnLogin.textContent = 'Sign In';
      btnToggleAuthMode.textContent = 'Need an account? Sign Up';
    }
    authErrorMsg.textContent = '';
    authErrorMsg.style.removeProperty('color');
  });

  btnLogin?.addEventListener('click', () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      authErrorMsg.textContent = 'Email & Password required';
      authErrorMsg.style.color = '#ef4444';
      return;
    }

    authErrorMsg.textContent = 'Loading...';
    authErrorMsg.style.removeProperty('color');
    const action = isSignupMode ? 'signup' : 'login';

    sendMessage(action, { email, password }, (response) => {
      if (response && response.error) {
        authErrorMsg.textContent = response.error.message || 'Auth failed';
        authErrorMsg.style.color = '#ef4444';
      } else if (isSignupMode && !response?.id) {
        // Fallback catch
        authErrorMsg.textContent = 'Signup Requires Confirmation (Check Email)';
      } else {
        // Success
        refreshAuthUI((user) => {
          if (isSignupMode && !user) {
            // Signup success but not logged in -> Confirmation needed
            authErrorMsg.textContent = 'Sign up successful! Check your email to confirm.';
            authErrorMsg.style.color = '#10b981'; // Green
            emailInput.value = '';
            passwordInput.value = '';
          } else {
            // Logged in (or login mode)
            authErrorMsg.textContent = '';
            emailInput.value = '';
            passwordInput.value = '';
          }
        });
      }
    });
  });

  btnLogout?.addEventListener('click', () => {
    sendMessage('logout', {}, () => refreshAuthUI());
  });

  btnUpgradeAccount?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('pricing.html') });
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
        const remaining = response.remaining;
        if (remaining !== undefined && remaining !== 'Unlimited') {
          // Optional: Show remaining count toast
          const badge = document.createElement('div');
          badge.className = 'limit-badge';
          badge.innerHTML = `<span style="font-size:10px; opacity:0.7">${remaining} free credits left</span>`;
          summaryContainer.prepend(badge);
        }
        summaryActions.classList.remove('hidden');
      } else if (response.limitReached) {
        summaryContainer.innerHTML = `
      <div class="action-empty-state" style="padding: 20px;">
                <div style="font-size: 32px; margin-bottom: 15px;">🛑</div>
                <h4 style="margin-bottom: 8px;">Free Limit Reached</h4>
                <p style="font-size: 13px; margin-bottom: 15px;">You've used your 5 free AI summaries this month.</p>
                <button id="btn-upgrade-summary" class="action-btn" style="background: linear-gradient(135deg, #6366f1, #8b5cf6);">Upgrade to Unlimited</button>
            </div>
      `;
        document.getElementById('btn-upgrade-summary')?.addEventListener('click', () => {
          chrome.tabs.create({ url: chrome.runtime.getURL('pricing.html') });
        });
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
          return '<ul>' + parsed.map(item => `< li > ${String(item).replace(/^[-•]\s*/, '')}</li > `).join('') + '</ul>';
        }
      } catch (e) {
        // Not valid JSON, continue to normal text processing
      }
    }

    // Convert bullet points to list
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length > 0 && lines.every(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().match(/^\d+\./))) {
      return '<ul>' + lines.map(l => `< li > ${l.replace(/^[-•]\s*|^\d+\.\s*/, '')}</li > `).join('') + '</ul>';
    }
    return `< p > ${text.replace(/\n/g, '<br>')}</p > `;
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
