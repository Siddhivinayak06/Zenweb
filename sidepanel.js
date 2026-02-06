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

  const settingsStatus = document.getElementById('settings-status');

  // Profile Elements
  const profileChips = document.querySelectorAll('.profile-chip');
  const btnClearProfile = document.getElementById('btn-clear-profile');

  // Appearance Elements
  const checkBold = document.getElementById('check-bold');
  const checkBionic = document.getElementById('check-bionic');
  const checkAdBlocker = document.getElementById('check-adblocker');
  const adsHiddenBadge = document.getElementById('ads-hidden-badge');
  const themeChips = document.querySelectorAll('.theme-chip');


  // ...

  // Chat Elements
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const btnSendChat = document.getElementById('btn-send-chat');

  // Dashboard & Website
  const btnWebsite = document.getElementById('btn-website');

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
      chrome.tabs.create({ url: chrome.runtime.getURL('website/pricing.html') });
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
        return;
      }

      connectionStatus.classList.add('connected');
      refreshStatus();
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
      if (currentActiveProfile) {
        profileSection.classList.add('hidden');
        adaptiveTools.classList.remove('hidden');
        const config = profileConfigs[currentActiveProfile];
        if (config) {
          activeProfileName.textContent = config.name;
          renderTools(config.tools);
        }
      }
    });

    // Initial Sync
    syncUIFromStorage();
  }

  function syncUIFromStorage() {
    chrome.storage.local.get(['fontBoldActive', 'fontDyslexiaActive', 'bionicReading', 'theme', 'adBlockerEnabled'], (result) => {
      // 1. Update Appearance Checkboxes
      if (checkBold) checkBold.checked = !!result.fontBoldActive;
      if (checkBionic) checkBionic.checked = !!result.bionicReading;
      if (checkAdBlocker) checkAdBlocker.checked = result.adBlockerEnabled !== false;
      updateThemeUI(result.theme || 'light');

      // 2. Update Adaptive Tool Buttons
      syncAdaptiveToolStates(result);
    });
  }

  function syncAdaptiveToolStates(prefs) {
    const toolButtons = toolContainer.querySelectorAll('.quick-btn');
    toolButtons.forEach(btn => {
      const toolKey = btn.dataset.toolKey;
      if (!toolKey) return;

      const tool = tools[toolKey];
      if (tool && tool.type === 'toggle') {
        let isActive = false;
        if (tool.action === 'toggle_bold') isActive = !!prefs.fontBoldActive;
        if (tool.action === 'toggle_dyslexia') isActive = !!prefs.fontDyslexiaActive;
        if (tool.action === 'toggle_bionic') isActive = !!prefs.bionicReading;

        btn.classList.toggle('active', isActive);
      }
    });
  }

  function setFeatureState(feature, enabled) {
    const storageKey = feature === 'bold' ? 'fontBoldActive' :
      feature === 'dyslexia' ? 'fontDyslexiaActive' :
        feature === 'bionic' ? 'bionicReading' : null;

    if (storageKey) {
      chrome.storage.local.set({ [storageKey]: enabled });

      // Bionic uses different action names than font toggles
      if (feature === 'bionic') {
        sendMessage(enabled ? 'enable_bionic' : 'disable_bionic');
      } else {
        sendMessage(enabled ? `enable_${feature}` : `disable_${feature}`);
      }

      // SYNC ALL UI
      syncUIFromStorage();
    }
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

      // Sync autism tool states
      if (response.mutedOverlay !== undefined) {
        const overlayBtn = toolContainer.querySelector('[data-tool-key="overlay"]');
        if (overlayBtn) overlayBtn.classList.toggle('active', response.mutedOverlay);
      }
      if (response.pageFreezer !== undefined) {
        const freezerBtn = toolContainer.querySelector('[data-tool-key="freezer"]');
        if (freezerBtn) freezerBtn.classList.toggle('active', response.pageFreezer);
      }

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
    if (btnSimplify) btnSimplify.classList.toggle('active', simplifyOn);
    if (btnFocus) btnFocus.classList.toggle('active', focusOn);
  }

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

  // ========================================
  // ADAPTIVE TOOLS LOGIC
  // ========================================

  const adaptiveTools = document.getElementById('adaptive-tools');
  const toolContainer = document.getElementById('tool-container');
  const activeProfileName = document.getElementById('active-profile-name');
  const profileSection = document.querySelector('.profile-section');
  const btnResetTools = document.getElementById('btn-reset-tools');
  const profileCards = document.querySelectorAll('.profile-card');

  // Tool Definitions
  const tools = {
    focus: { id: 'btn-focus', icon: '🎯', label: 'Focus Mode', action: 'toggle_focus' },
    simplify: { id: 'btn-simplify', icon: '📖', label: 'Simplify', action: 'toggle_simplify' },
    bold: { id: 'check-bold', icon: 'B', label: 'Bold Font', type: 'toggle', action: 'toggle_bold' },
    dyslexia: { id: 'btn-dyslexia', icon: 'Aa', label: 'Dyslexia Font', type: 'toggle', action: 'toggle_dyslexia' },
    summarize: { id: 'btn-summarize', icon: '✨', label: 'Summarize', action: 'summarize' },
    pause: { id: 'btn-pause', icon: '⏸️', label: 'Pause Animations', action: 'toggle_pause' },
    speech: { id: 'btn-speech', icon: '🗣️', label: 'Read Aloud', action: 'read_aloud' },
    bionic: { id: 'btn-bionic', icon: '🧬', label: 'Bionic Reading', type: 'toggle', action: 'toggle_bionic' },
    zoom: { id: 'btn-zoom', icon: '🔍', label: 'Text Size', type: 'range', action: 'set_zoom' },
    step: { id: 'btn-step', icon: '👣', label: 'Step Reading', type: 'toggle', action: 'toggle_step_by_step' },
    fatigue: { id: 'btn-fatigue', icon: '🛡️', label: 'Fatigue Filter', type: 'toggle', action: 'toggle_fatigue_filter' },
    overlay: { id: 'btn-overlay', icon: '🎨', label: 'Muted Overlay', type: 'toggle', action: 'toggle_muted_overlay' },
    freezer: { id: 'btn-freezer', icon: '❄️', label: 'Page Freezer', type: 'toggle', action: 'toggle_page_freezer' }
  };

  // Profile Configurations
  const profileConfigs = {
    adhd: {
      name: 'ADHD Mode',
      description: 'Optimized for focus and attention.',
      features: [
        { label: '15m Focus Timer ⏱️', detail: 'Uses the Pomodoro technique to break work into manageable 15-minute chunks.' },
        { label: 'Blocked Animations 🚫', detail: 'Stops distracting GIFs and CSS animations to keep your focus steady.' },
        { label: 'Simplified Layout ✨', detail: 'Removes sidebar clutter and non-essential elements.' },
        { label: 'Auto-Summarizer 📝', detail: 'Automatically generates a concise summary of long articles.' },
        { label: 'Bionic Reading 🧬', detail: 'Bolds the start of words to help your brain skip through text faster.' }
      ],
      tools: ['focus', 'simplify', 'bionic', 'pause', 'summarize']
    },
    dyslexia: {
      name: 'Dyslexia Mode',
      description: 'Enhanced readability settings.',
      features: [
        { label: 'Dyslexia Font 📖', detail: 'Applies OpenDyslexic font to improve reading accuracy.' },
        { label: 'Speech-to-Text 🗣️', detail: 'Reads the page content aloud with natural voice.' },
        { label: 'Larger Text 🔍', detail: 'Increases font size and line spacing for better clarity.' },
        { label: 'High Contrast 🌗', detail: 'Adjusts colors to maximize text visibility.' },
        { label: 'Bionic Reading 🧬', detail: 'Bolds word starts to help eyes follow text without losing place.' }
      ],
      tools: ['dyslexia', 'bionic', 'speech', 'simplify', 'zoom']
    },
    anxiety: {
      name: 'Calm Mode',
      description: 'Reduces sensory overload.',
      features: [
        { label: 'Soft Colors (Sepia) ☕', detail: 'Applies a warm sepia tone to reduce eye strain and anxiety.' },
        { label: 'Hidden Distractions 🛡️', detail: 'Blocks popups, ads, and notification badges.' },
        { label: 'No Animations ⏸️', detail: 'Pauses all moving elements to create a static, calm environment.' },
        { label: 'Breathing Guide 🧘', detail: 'Provides visual cues for calming breathing exercises.' }
      ],
      tools: ['simplify', 'pause', 'focus']
    },
    vision: {
      name: 'Vision Mode',
      description: 'Visual accessibility helpers.',
      features: [
        { label: 'Maximized Text Size 🔍', detail: 'Scales text to 150% for maximum visibility.' },
        { label: 'Read Aloud 🗣️', detail: 'Converts text to speech for auditory consumption.' },
        { label: 'High Contrast 🌗', detail: 'Inverts colors to white-on-black for reduced glare.' },
        { label: 'Dyslexia Friendly 📖', detail: 'Optimizes fonts for easier character recognition.' }
      ],
      tools: ['zoom', 'speech', 'dyslexia']
    },
    neuro: {
      name: 'Fatigue Mode',
      description: 'Advanced cognition & focus suite.',
      features: [
        { label: 'Step-by-Step Navigation 👣', detail: 'Focus on one paragraph at a time. No overwhelming walls of text.' },
        { label: 'Bionic Formatting 🧬', detail: 'Bolds word starts to speed up cognitive processing.' },
        { label: 'Aggressive Simplifier ✨', detail: 'Strips everything but the primary article content.' }
      ],
      tools: ['step', 'simplify', 'bionic']
    },
    autism: {
      name: 'Autism Mode',
      description: 'Sensory-friendly browsing.',
      features: [
        { label: 'Muted Overlay 🎨', detail: 'Applies a calming wheat-toned overlay at 20% opacity to reduce visual intensity.' },
        { label: 'Page Freezer ❄️', detail: 'Stops all media, freezes GIFs, and disables scrolling for a completely static page.' },
        { label: 'Blocked Animations 🚫', detail: 'Stops distracting CSS animations and transitions.' },
        { label: 'Muted Colors 🌅', detail: 'Reduces color saturation for a gentler visual experience.' }
      ],
      tools: ['overlay', 'freezer', 'pause', 'simplify']
    }
  };

  // Profile Selection
  const modeInfoPanel = document.getElementById('mode-info-panel');
  const infoTitle = document.getElementById('info-title');
  const infoDesc = document.getElementById('info-desc');

  // Detail Box (Static)
  const detailBox = document.getElementById('feature-detail-box');

  let hideTimeout;

  const showInfoPanel = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    modeInfoPanel?.classList.remove('hidden');
  };

  const hideInfoPanel = () => {
    if (hideTimeout) clearTimeout(hideTimeout);
    hideTimeout = setTimeout(() => {
      modeInfoPanel?.classList.add('hidden');
      if (detailBox) detailBox.classList.add('hidden');
    }, 2000); // 2 second delay
  };

  profileCards.forEach(card => {
    card.addEventListener('click', () => {
      const profile = card.dataset.profile;
      activateProfile(profile);
    });

    // Hover Effect
    card.addEventListener('mouseenter', () => {
      const profileId = card.dataset.profile;
      const config = profileConfigs[profileId];
      if (config) {
        showInfoPanel();
        infoTitle.textContent = config.name;

        if (config.features) {
          // Generate list with data attributes
          const listHtml = config.features.map((f, index) =>
            `<li class="feature-item" data-index="${index}" style="margin-bottom:4px; cursor:help;">${f.label}</li>`
          ).join('');
          infoDesc.innerHTML = `<ul style="padding-left:16px; margin:4px 0;">${listHtml}</ul>`;

          // Add hover listeners to the new list items
          const items = infoDesc.querySelectorAll('.feature-item');
          items.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
              e.stopPropagation();
              const idx = item.dataset.index;
              const feature = config.features[idx];
              if (feature && detailBox) {
                detailBox.textContent = feature.detail;
                detailBox.classList.remove('hidden');
                item.style.color = 'var(--accent-primary)';
              }
            });
            item.addEventListener('mouseleave', () => {
              // We don't necessarily need to hide the detailBox here if we want it to stay for 2s too
              // but standard behavior is the detail follows the main panel.
              // Let's keep it simple: resetting the color is fine.
              item.style.color = '';
            });
          });

        } else {
          infoDesc.textContent = config.description;
        }
      }
    });

    card.addEventListener('mouseleave', () => {
      hideInfoPanel();
    });
  });

  // Keep panel open if hovering the panel itself
  modeInfoPanel?.addEventListener('mouseenter', showInfoPanel);
  modeInfoPanel?.addEventListener('mouseleave', hideInfoPanel);

  btnResetTools?.addEventListener('click', () => {
    resetToProfileSelection();
  });

  function activateProfile(profileId) {
    const config = profileConfigs[profileId];
    if (!config) return;

    // UI Transition
    profileSection.classList.add('hidden');
    adaptiveTools.classList.remove('hidden');
    activeProfileName.textContent = config.name;

    // Render Tools
    renderTools(config.tools);

    // Persist
    chrome.storage.sync.set({ activeProfile: profileId });
    sendMessage('set_profile', { profileId });
  }

  function resetToProfileSelection() {
    profileSection.classList.remove('hidden');
    adaptiveTools.classList.add('hidden');
    chrome.storage.sync.remove('activeProfile');
    sendMessage('clear_profile');
  }

  // ========================================
  // SUMMARY PANEL LOGIC
  // ========================================
  const summaryPanel = document.getElementById('summary-panel');
  const summaryContent = document.getElementById('summary-content');
  const btnCloseSummary = document.getElementById('btn-close-summary');
  const summaryRemaining = document.getElementById('summary-remaining');

  if (btnCloseSummary) {
    btnCloseSummary.addEventListener('click', () => {
      summaryPanel.classList.add('hidden');
    });
  }

  function renderSummary(points, remaining) {
    if (!points || points.length === 0) {
      summaryContent.innerHTML = '<p>No summary available.</p>';
    } else {
      summaryContent.innerHTML = points.map(p => `<div class="summary-item">${p}</div>`).join('');
    }
    if (summaryRemaining) {
      summaryRemaining.textContent = `Remaining: ${remaining}`;
    }
    summaryPanel.classList.remove('hidden');
  }

  // Tool Definitions
  // ... (tools variable is outside, we are just hooking into renderTools)

  function renderTools(toolKeys) {
    toolContainer.innerHTML = '';
    toolKeys.forEach(key => {
      const tool = tools[key];
      if (!tool) return;

      const btn = document.createElement('button');
      btn.className = 'quick-btn';
      btn.innerHTML = `
        <span class="quick-icon">${tool.icon}</span>
        <span class="quick-label">${tool.label}</span>
      `;

      btn.dataset.toolKey = key;
      btn.addEventListener('click', () => {
        if (tool.action === 'toggle_bold') {
          setFeatureState('bold', !btn.classList.contains('active'));
        } else if (tool.action === 'toggle_dyslexia') {
          setFeatureState('dyslexia', !btn.classList.contains('active'));
        } else if (tool.action === 'toggle_bionic') {
          setFeatureState('bionic', !btn.classList.contains('active'));
        } else if (tool.action === 'toggle_step_by_step') {
          const isActive = btn.classList.toggle('active');
          sendMessage(tool.action, { enabled: isActive });
        } else if (tool.action === 'toggle_fatigue_filter') {
          const isActive = btn.classList.toggle('active');
          sendMessage(tool.action, { enabled: isActive });
        } else if (tool.action === 'toggle_muted_overlay') {
          sendMessage(tool.action, {}, (response) => {
            if (response) btn.classList.toggle('active', response.enabled);
          });
        } else if (tool.action === 'toggle_page_freezer') {
          sendMessage(tool.action, {}, (response) => {
            if (response) btn.classList.toggle('active', response.enabled);
          });
        } else if (tool.action === 'summarize') {
          const originalText = btn.innerHTML;
          btn.innerHTML = `<span class="quick-icon">⏳</span><span class="quick-label">Thinking...</span>`;

          sendMessage('summarize', {}, (response) => {
            btn.innerHTML = originalText;
            if (response && response.summary) {
              renderSummary(response.summary, response.remaining);
            } else if (response && response.error) {
              // Show error in a toast or alert? For now using summary panel for error text
              summaryContent.innerHTML = `<p style="color:var(--danger-color);">${response.error}</p>`;
              summaryPanel.classList.remove('hidden');
            }
            refreshStatus();
          });
        } else {
          sendMessage(tool.action, {}, () => refreshStatus());
        }
      });

      toolContainer.appendChild(btn);
    });
  }

  // Auto-load profile
  chrome.storage.sync.get(['activeProfile'], (result) => {
    if (result.activeProfile && profileConfigs[result.activeProfile]) {
      activateProfile(result.activeProfile);
    }
  });

  // ========================================
  // AD BLOCKER LOGIC
  // ========================================
  const checkAdBlockerMain = document.getElementById('check-adblocker-main');

  // Sync on load
  chrome.storage.local.get(['adBlockerEnabled'], (result) => {
    const enabled = result.adBlockerEnabled !== false; // Default true
    if (checkAdBlockerMain) checkAdBlockerMain.checked = enabled;
  });

  checkAdBlockerMain?.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    sendMessage(isEnabled ? 'enable_adblocker' : 'disable_adblocker');
    if (checkAdBlocker) checkAdBlocker.checked = isEnabled;
  });

  checkAdBlocker?.addEventListener('change', (e) => {
    if (checkAdBlockerMain) checkAdBlockerMain.checked = e.target.checked;
    const isEnabled = e.target.checked;
    sendMessage(isEnabled ? 'enable_adblocker' : 'disable_adblocker');
  });

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

  checkBold?.addEventListener('change', (e) => {
    setFeatureState('bold', e.target.checked);
  });

  checkBionic?.addEventListener('change', (e) => {
    setFeatureState('bionic', e.target.checked);
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
    document.body.classList.add('switching-theme');
    document.body.classList.remove('theme-light', 'theme-sepia', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    themeChips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.theme === theme);
    });

    setTimeout(() => {
      document.body.classList.remove('switching-theme');
    }, 300);
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
    // 1. Check Subscription Status (Handles both Cloud & Local Plans)
    sendMessage('get_subscription_status', {}, (subCallback) => {
      const isPro = subCallback?.isPro === true;

      // 2. Get User Details
      sendMessage('get_user_status', {}, (user) => {
        if (user) {
          loggedOutView.classList.add('hidden');
          loggedInView.classList.remove('hidden');
          userName.textContent = user.name || user.email;
          userAvatar.src = user.avatar;

          // Use the status from get_subscription_status
          if (isPro) {
            userPlanBadge.textContent = 'PRO';
            userPlanBadge.className = 'badge pro-badge';
            userPlanBadge.style.background = 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)';
            userPlanBadge.style.color = 'white';
            btnUpgradeAccount.classList.add('hidden');
          } else {
            userPlanBadge.textContent = 'FREE';
            userPlanBadge.className = 'badge';
            userPlanBadge.style.background = '#e2e8f0';
            userPlanBadge.style.color = '#64748b';
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
    chrome.tabs.create({ url: chrome.runtime.getURL('website/pricing.html') });
  });

  // ========================================
  // QUICK LINKS
  // ========================================



  btnWebsite?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('website/index.html') });
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
      // Get page content
      const pageContent = await new Promise(resolve => {
        sendMessage('get_page_content', {}, r => resolve(r?.content || ''));
      });

      // Delegate Chat to Background (Handles API Key & Limits)
      sendMessage('chat_with_api', { question, context: pageContent }, (response) => {
        removeChatBubble(loadingId);

        if (response && response.answer) {
          addChatBubble(response.answer, 'ai');
        } else if (response && response.error) {
          addChatBubble('Error: ' + response.error, 'ai');
        } else {
          addChatBubble('Sorry, something went wrong.', 'ai');
        }
      });

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

  document.getElementById('btn-website')?.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('website/index.html') });
  });

  // ========================================
  // TAB CHANGE LISTENERS
  // ========================================

  chrome.tabs.onActivated.addListener(updateActiveTab);
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (tabId === currentTabId && changeInfo.status === 'complete') {
      refreshStatus();
    }
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.activeProfile) {
      currentActiveProfile = changes.activeProfile.newValue || null;
      if (currentActiveProfile && profileConfigs[currentActiveProfile]) {
        activateProfile(currentActiveProfile);
      }
    }
    if (namespace === 'local') {
      if (changes.theme) updateThemeUI(changes.theme.newValue);
      if (changes.fontBoldActive && checkBold) {
        checkBold.checked = !!changes.fontBoldActive.newValue;
      }
      if (changes.bionicReading && checkBionic) {
        checkBionic.checked = !!changes.bionicReading.newValue;
      }
    }
  });



  // Initialize
  init();
});
