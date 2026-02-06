/**
 * FatigueManager - Monitors visual burnout and suggests breaks
 */
class FatigueManager {
    constructor() {
        this.trackScroll = true;
        this.lastAction = Date.now();
        this.threshold = 20 * 60 * 1000; // 20 minutes
        this.checkInterval = 60 * 1000; // Check every minute
        this.timer = null;
        this.isEnabled = false;
        this.isBreakActive = false;
    }

    start() {
        if (this.isEnabled) return;
        this.isEnabled = true;
        this.lastAction = Date.now();

        // Listen for activity
        this.activityHandler = () => {
            if (!this.isBreakActive) {
                this.lastAction = Date.now();
            }
        };

        window.addEventListener('scroll', this.activityHandler, { passive: true });
        window.addEventListener('mousemove', this.activityHandler, { passive: true });
        window.addEventListener('keydown', this.activityHandler, { passive: true });

        this.timer = setInterval(() => this.checkFatigue(), this.checkInterval);
        console.log('ZenWeb: Fatigue Filter Started');
    }

    stop() {
        this.isEnabled = false;
        window.removeEventListener('scroll', this.activityHandler);
        window.removeEventListener('mousemove', this.activityHandler);
        window.removeEventListener('keydown', this.activityHandler);
        if (this.timer) clearInterval(this.timer);
    }

    checkFatigue() {
        const now = Date.now();
        const inactiveTime = now - this.lastAction;

        // If user has been moderately active for more than threshold
        // (This is a simplified logic: if last activity was within 2 mins but start was long ago)
        // Actually let's track "Continuous Reading Time"
        if (!this.sessionStart) this.sessionStart = now;

        const sessionDuration = now - this.sessionStart;

        if (sessionDuration > this.threshold) {
            this.showBreakReminder();
            this.sessionStart = now; // Reset for next cycle
        }
    }

    showBreakReminder() {
        this.isBreakActive = true;
        const overlay = document.createElement('div');
        overlay.id = 'zenweb-fatigue-overlay';
        overlay.innerHTML = `
            <div class="fatigue-card">
                <div class="fatigue-icon">🛡️</div>
                <h3>Fatigue Filter</h3>
                <p>You've been focused for 20 minutes. Time for a quick 2-minute brain rest to prevent burnout.</p>
                <div class="fatigue-countdown" id="fatigue-timer">02:00</div>
                <button class="fatigue-skip">Skip Break</button>
            </div>
        `;

        document.body.appendChild(overlay);

        let remaining = 120;
        const countdown = setInterval(() => {
            remaining--;
            const mins = Math.floor(remaining / 60);
            const secs = remaining % 60;
            const timerEl = document.getElementById('fatigue-timer');
            if (timerEl) timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

            if (remaining <= 0) {
                clearInterval(countdown);
                this.removeOverlay(overlay);
            }
        }, 1000);

        overlay.querySelector('.fatigue-skip').addEventListener('click', () => {
            clearInterval(countdown);
            this.removeOverlay(overlay);
        });
    }

    removeOverlay(overlay) {
        overlay.classList.add('fade-out');
        setTimeout(() => {
            overlay.remove();
            this.isBreakActive = false;
            this.lastAction = Date.now();
            this.sessionStart = Date.now();
        }, 500);
    }
}

if (typeof window !== 'undefined') {
    window.FatigueManager = FatigueManager;
}
