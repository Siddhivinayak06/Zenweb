class FocusManager {
    constructor(themeManager) {
        this.isActive = false;
        this.timerInterval = null;
        this.timeLeft = 25 * 60; // 25 minutes
        this.timerRunning = false;
        this.themeManager = themeManager;
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        document.body.classList.add('context-aware-focus');
        this.injectTimer();
        this.enableVisualAids();
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
        // Debounce or check target type
        const p = target.closest('p, li, h1, h2, h3, h4, blockquote');

        // Remove previous highlight if detailed
        const current = document.querySelector('.focus-mode-highlight');
        if (current && current !== p) {
            current.classList.remove('focus-mode-highlight');
        }

        if (p) {
            p.classList.add('focus-mode-highlight');
        }
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
}
