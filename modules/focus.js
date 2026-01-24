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
    }

    disableVisualAids() {
        if (this.readingGuide) this.readingGuide.remove();
        document.removeEventListener('mousemove', this.mouseMoveHandler);

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

    injectTimer() {
        if (document.getElementById('zenweb-focus-timer')) return;

        const timer = document.createElement('div');
        timer.id = 'zenweb-focus-timer';
        timer.className = 'zenweb-timer-widget';
        timer.innerHTML = `
            <div class="timer-display">25:00</div>
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
                this.stopTimer();
                this.timeLeft = mins * 60;
                this.updateTimerDisplay();
                // feedback
                presets.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    removeTimer() {
        const timer = document.getElementById('zenweb-focus-timer');
        if (timer) timer.remove();
        this.stopTimer();
    }

    toggleTimer() {
        if (this.timerRunning) {
            this.stopTimer();
        } else {
            this.startTimer();
        }
        this.updateTimerUI();
    }

    startTimer() {
        if (this.timerRunning) return;
        this.timerRunning = true;
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateTimerDisplay();
            if (this.timeLeft <= 0) {
                this.stopTimer();
                this.timerEnded();
            }
        }, 1000);
    }

    stopTimer() {
        this.timerRunning = false;
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    resetTimer() {
        this.stopTimer();
        this.timeLeft = 25 * 60;
        this.updateTimerDisplay();
        this.updateTimerUI();
    }

    updateTimerDisplay() {
        const timerDisplay = document.querySelector('#zenweb-focus-timer .timer-display');
        if (timerDisplay) {
            const m = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
            const s = (this.timeLeft % 60).toString().padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }
    }

    updateTimerUI() {
        const toggleBtn = document.querySelector('#zenweb-focus-timer #timer-toggle');
        if (toggleBtn) {
            toggleBtn.textContent = this.timerRunning ? '⏸' : '▶';
        }
    }

    timerEnded() {
        // Simple alert or notification
        alert("Focus Session Complete! Take a break.");
        this.resetTimer();
    }
}
