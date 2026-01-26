class FocusManager {
    constructor(themeManager) {
        this.isActive = false;
        this.timerInterval = null;
        this.timeLeft = 25 * 60; // 25 minutes
        this.timerRunning = false;
        this.themeManager = themeManager;
        this.lineFocusMode = 'normal'; // 'normal' (3 lines) or 'narrow' (1 line)
        this.currentScale = 100; // Percentage
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        document.body.classList.add('context-aware-focus');
        window.focus(); // Force focus to main window to capture keys
        this.injectTimer();
        this.enableVisualAids();
        this.dispatchToast("Focus Mode Active. Click page if keys don't work.");
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        document.body.classList.remove('context-aware-focus');
        this.removeTimer();
        this.disableVisualAids();
    }

    enableVisualAids() {
        // Reading Guide
        this.readingGuide = document.createElement('div');
        this.readingGuide.className = 'zenweb-reading-guide';
        document.body.appendChild(this.readingGuide);

        this.mouseMoveHandler = (e) => {
            this.readingGuide.style.top = `${e.clientY}px`;

            // Paragraph Highlighting
            this.handleParagraphHighlight(e.target);
        };

        document.addEventListener('mousemove', this.mouseMoveHandler);

        this.keyDownHandler = (e) => {
            if (e.key === 'Escape') {
                this.disable();
            } else if (this.isActive && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
                e.preventDefault();
                // Debug feedback
                // this.dispatchToast(`Navigating ${e.key}`);
                this.navigateFocus(e.key === 'ArrowDown' ? 1 : -1);
            }
        };
        document.addEventListener('keydown', this.keyDownHandler);
    }

    disableVisualAids() {
        if (this.readingGuide) this.readingGuide.remove();
        document.removeEventListener('mousemove', this.mouseMoveHandler);
        if (this.keyDownHandler) {
            document.removeEventListener('keydown', this.keyDownHandler);
            this.keyDownHandler = null;
        }

        // Clear any active highlights
        const highlighted = document.querySelectorAll('.focus-mode-highlight');
        highlighted.forEach(el => el.classList.remove('focus-mode-highlight'));
    }

    handleParagraphHighlight(target) {
        // Find the best candidate first (semantic tag or explicit image)
        let p = target.closest('p, li, h1, h2, h3, h4, blockquote, pre, figure');

        // Check for explicit image target
        if (target.tagName === 'IMG' || target.tagName === 'PICTURE') {
            if (this.isValidTarget(target)) {
                p = target;
            }
        }

        // Fallback: Check for generic text containers
        if (!p && ['DIV', 'SPAN', 'ARTICLE', 'SECTION', 'MAIN'].includes(target.tagName)) {
            if (this.isValidTarget(target)) {
                p = target;
            }
        }

        // Final validation of the candidate "p"
        if (p && !this.isValidTarget(p)) {
            p = null;
        }

        // Remove previous highlight if detained
        const current = document.querySelector('.focus-mode-highlight');
        if (current && current !== p) {
            current.classList.remove('focus-mode-highlight');
        }

        if (p) {
            p.classList.add('focus-mode-highlight');
            // Apply current scale
            if (this.currentScale !== 100) {
                p.style.fontSize = `${this.currentScale}%`;
                p.style.lineHeight = '1.6';
            }
        }
    }

    isValidTarget(node) {
        if (!node) return false;
        if (node.offsetParent === null) return false; // Hidden

        const rect = node.getBoundingClientRect();
        const tagName = node.tagName;

        // 1. Explicit Image Check
        if (tagName === 'IMG' || tagName === 'PICTURE') {
            return (rect.width > 200 && rect.height > 100);
        }

        // 2. Size Check (General)
        // Too small to be meaningful content?
        if (rect.width < 60 && rect.height < 60) return false;

        // Too big? (Page wrapper)
        if (rect.height > window.innerHeight * 0.8 || rect.width > window.innerWidth * 0.9) return false;

        // 3. List Item Specifics (Social Icons)
        if (tagName === 'LI') {
            // Square-ish and small usually means icon button
            if (rect.width < 100 && rect.height < 100 && Math.abs(rect.width - rect.height) < 20) {
                if (node.innerText.trim().length < 4) return false;
            }
        }

        // 4. Text Content Check
        // Does it have enough text to be worth reading?
        // Semantic tags get a pass with less text, generic divs need more.
        const textLen = node.innerText.trim().length;
        if (['P', 'H1', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'LI'].includes(tagName)) {
            return textLen > 0;
        }

        // For generic containers, ensure significant direct text
        if (['DIV', 'SPAN', 'ARTICLE', 'SECTION', 'MAIN'].includes(tagName)) {
            let hasDirectText = false;
            for (let child of node.childNodes) {
                if (child.nodeType === 3 && child.textContent.trim().length > 20) {
                    hasDirectText = true;
                    break;
                }
            }
            return hasDirectText;
        }

        // Default allow for other explicitly handled tags like FIGURE/PRE if size checks pass
        return true;
    }

    navigateFocus(direction) {
        // 1 for next, -1 for previous
        const current = document.querySelector('.focus-mode-highlight');
        const elements = this.getNavigableElements();

        console.log(`ZenWeb Nav: Found ${elements.length} elements. Current:`, current);

        if (elements.length === 0) {
            this.dispatchToast("No readable text found on this page.");
            return;
        }

        let index = -1;
        if (current) {
            index = elements.indexOf(current);
        }

        let nextIndex = index + direction;

        // Bounds check
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= elements.length) nextIndex = elements.length - 1;

        const target = elements[nextIndex];

        if (target && target !== current) {
            this.handleParagraphHighlight(target);
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Update reading guide position
            if (this.readingGuide) {
                const rect = target.getBoundingClientRect();
                // We need the Y position relative to viewport, but scrollIntoView will move it.
                // Best to wait a tick or estimate based on block: center
                // Actually, since scroll is smooth, immediate retrieval might be wrong.
                // But for the guide overlay, we can just center it on screen since we centered the block.
                this.readingGuide.style.top = `50vh`;
            }
        }
    }

    getNavigableElements() {
        // Collect all potential highlight targets in document order
        // This traverses effectively to find likely candidates
        // We use a tree walker to find text nodes, then get their parent blocks
        const candidates = new Set();

        // Simplified approach: Query select all candidates and filter
        const selector = 'p, li, h1, h2, h3, h4, blockquote, pre, div, article, section, span, img, figure, picture';
        const nodes = document.querySelectorAll(selector);

        nodes.forEach(node => {
            if (this.isValidTarget(node)) {
                candidates.add(node);
            }
        });

        return Array.from(candidates);
    }

    async injectTimer() {
        if (document.getElementById('zenweb-focus-timer')) return;

        const timer = document.createElement('div');
        timer.id = 'zenweb-focus-timer';
        timer.className = 'zenweb-timer-widget';
        timer.innerHTML = `
            <div class="timer-display">--:--</div>
            <div class="timer-controls">
                <button id="timer-toggle" title="Start/Pause">▶</button>
                <button id="timer-reset" title="Reset">↺</button>
            </div>
            <div class="timer-extra-controls">
                <button class="text-size-btn" id="btn-text-inc" title="Increase Text Size">A+</button>
                <button class="text-size-btn" id="btn-text-dec" title="Decrease Text Size">A-</button>
                <button class="text-size-btn line-focus-btn" id="btn-line-focus" title="Toggle Line Focus Height">≡</button>
            </div>
            <div class="timer-presets">
                <button data-time="25">Focus</button>
                <button data-time="5">Break</button>
            </div>
        `;
        document.body.appendChild(timer);

        // Bind events
        const toggleBtn = timer.querySelector('#timer-toggle');
        const resetBtn = timer.querySelector('#timer-reset');

        toggleBtn.addEventListener('click', () => this.toggleTimer());
        resetBtn.addEventListener('click', () => this.resetTimer());

        const presets = timer.querySelectorAll('.timer-presets button');
        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                const mins = parseInt(btn.dataset.time);
                this.setTimerDuration(mins);
            });
        });

        // Extra Controls
        timer.querySelector('#btn-text-inc').addEventListener('click', () => this.adjustTextSize(10));
        timer.querySelector('#btn-text-dec').addEventListener('click', () => this.adjustTextSize(-10));
        timer.querySelector('#btn-line-focus').addEventListener('click', () => this.toggleLineFocus());

        // Initialize state from storage
        const state = await this.getTimerState();
        if (state.isRunning) {
            this.startTicker();
        }
        this.updateTimerUI(state);
    }

    removeTimer() {
        const timer = document.getElementById('zenweb-focus-timer');
        if (timer) timer.remove();
        this.stopTicker();
    }

    async getTimerState() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['focusTimer'], (result) => {
                const now = Date.now();
                const data = result.focusTimer || {
                    isRunning: false,
                    endTime: null,
                    remaining: 25 * 60,
                    lastUpdated: now
                };

                // If running, recalculate remaining
                if (data.isRunning && data.endTime) {
                    const remaining = Math.max(0, Math.ceil((data.endTime - now) / 1000));
                    if (remaining === 0) {
                        data.isRunning = false; // Expired
                        data.remaining = 0;
                        this.saveTimerState(data); // Sync expiration
                    } else {
                        data.remaining = remaining;
                    }
                }

                resolve(data);
            });
        });
    }

    saveTimerState(state) {
        chrome.storage.local.set({ focusTimer: state });
        this.updateTimerUI(state);
    }

    async setTimerDuration(minutes) {
        const state = {
            isRunning: false,
            endTime: null,
            remaining: minutes * 60,
            lastUpdated: Date.now()
        };
        this.saveTimerState(state);
        this.stopTicker(); // Stop any running ticker
    }

    async toggleTimer() {
        let state = await this.getTimerState();
        if (state.isRunning) {
            // Pause
            state.isRunning = false;
            state.endTime = null; // Clear end time
            this.stopTicker();
        } else {
            // Start
            if (state.remaining <= 0) state.remaining = 25 * 60; // Reset if 0
            state.isRunning = true;
            state.endTime = Date.now() + (state.remaining * 1000);
            this.startTicker();
        }
        this.saveTimerState(state);
    }

    async resetTimer() {
        this.stopTicker();
        // Default to last known duration or 25 mins? Let's reset to 25.
        const state = {
            isRunning: false,
            endTime: null,
            remaining: 25 * 60,
            lastUpdated: Date.now()
        };
        this.saveTimerState(state);
    }

    startTicker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(async () => {
            const state = await this.getTimerState(); // Fetch fresh to stay synced? Or just local logic?
            // Optimization: Just calc local based on known EndTime if running
            // But we need to check if another tab paused it.
            // For now, let's trust the checking logic in getTimerState handles the time calc.

            if (!state.isRunning) {
                this.stopTicker();
                return;
            }

            this.updateTimerUI(state);

            if (state.remaining <= 0) {
                this.stopTicker();
                this.timerEnded();
            }
        }, 1000);
    }

    stopTicker() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    updateTimerUI(state) {
        if (!state) return;

        const timerDisplay = document.querySelector('#zenweb-focus-timer .timer-display');
        const toggleBtn = document.querySelector('#zenweb-focus-timer #timer-toggle');

        if (timerDisplay) {
            const m = Math.floor(state.remaining / 60).toString().padStart(2, '0');
            const s = (state.remaining % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }

        if (toggleBtn) {
            toggleBtn.textContent = state.isRunning ? '⏸' : '▶';
        }
    }

    timerEnded() {
        // Simple alert or notification
        alert("Focus Session Complete! Take a break.");
        this.resetTimer();
    }

    adjustTextSize(delta) {
        this.currentScale += delta;
        if (this.currentScale < 80) this.currentScale = 80;
        if (this.currentScale > 200) this.currentScale = 200;

        const highlighted = document.querySelector('.focus-mode-highlight');
        if (highlighted) {
            highlighted.style.fontSize = `${this.currentScale}%`;
            highlighted.style.lineHeight = '1.6'; // Ensure readability
        }

        // Also apply to body specifically for context-aware-focus so newly highlighted elements inherit if needed
        // But per paragraph is better. Let's just store it and apply on hover.
    }

    toggleLineFocus() {
        this.lineFocusMode = this.lineFocusMode === 'normal' ? 'narrow' : 'normal';
        if (this.readingGuide) {
            const height = this.lineFocusMode === 'normal' ? '48px' : '24px';
            this.readingGuide.style.height = height;
        }
    }

    dispatchToast(msg) {
        document.dispatchEvent(new CustomEvent('zenweb:toast', { detail: { message: msg } }));
    }
}
