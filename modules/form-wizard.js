class FormWizard {
    constructor() {
        this.isActive = false;
        this.currentStep = 0;
        this.steps = [];
        this.originalForm = null;
        this.overlay = null;
    }

    // Initialize logic if needed
    init() { }

    isComplexForm(form) {
        const inputs = form.querySelectorAll('input:not([type="hidden"]), select, textarea');
        return inputs.length > 5; // Lower threshold active wizard
    }

    start(form) {
        if (this.isActive) return;
        this.isActive = true;
        this.originalForm = form;

        // Hide original form visually but keep it for submission
        this.originalVisibility = form.style.visibility;
        this.originalDisplay = form.style.display;
        // form.style.visibility = 'hidden'; 
        // Better to hide it but keep it in layout or overlay it.
        // Let's use an overlay that covers the page.

        this.steps = this.parseForm(form);
        if (this.steps.length === 0) {
            this.isActive = false;
            return;
        }

        this.createOverlay();
        this.renderStep(0);
    }

    stop() {
        if (!this.isActive) return;
        this.isActive = false;

        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        if (this.originalForm) {
            // this.originalForm.style.visibility = this.originalVisibility;
            // this.originalForm.style.display = this.originalDisplay;
            this.originalForm = null;
        }
    }

    parseForm(form) {
        const inputs = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea'));
        // Group inputs logically. For now, simple chunking or fieldset based.
        const fieldsets = form.querySelectorAll('fieldset');

        let steps = [];

        if (fieldsets.length > 0) {
            fieldsets.forEach((fieldset, index) => {
                const stepInputs = Array.from(fieldset.querySelectorAll('input, select, textarea'));
                if (stepInputs.length > 0) {
                    steps.push({
                        title: fieldset.querySelector('legend')?.innerText || `Step ${index + 1}`,
                        inputs: stepInputs
                    });
                }
            });
        }

        // If no fieldsets or mixed, just chunk inputs
        if (steps.length === 0) {
            const chunkSize = 3;
            for (let i = 0; i < inputs.length; i += chunkSize) {
                const chunk = inputs.slice(i, i + chunkSize);
                steps.push({
                    title: `Part ${Math.floor(i / chunkSize) + 1}`,
                    inputs: chunk
                });
            }
        }

        return steps;
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'zenweb-wizard-overlay';
        this.overlay.innerHTML = `
            <div class="zenweb-wizard-container">
                <div class="zenweb-wizard-header">
                    <button class="zenweb-wizard-close">×</button>
                    <h2>Smart Form Assistant</h2>
                    <div class="zenweb-wizard-progress-bar">
                        <div class="zenweb-wizard-progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                <div class="zenweb-wizard-body">
                    <!-- Step Content Injected Here -->
                </div>
                <div class="zenweb-wizard-footer">
                    <button class="zenweb-wizard-prev" disabled>Previous</button>
                    <div class="zenweb-wizard-status">Step <span id="wiz-step-num">1</span> of <span id="wiz-total-steps"></span></div>
                    <button class="zenweb-wizard-next">Next</button>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);

        // Bind events
        this.overlay.querySelector('.zenweb-wizard-close').addEventListener('click', () => this.stop());
        this.overlay.querySelector('.zenweb-wizard-prev').addEventListener('click', () => this.prevStep());
        this.overlay.querySelector('.zenweb-wizard-next').addEventListener('click', () => this.nextStep());
    }

    renderStep(index) {
        this.currentStep = index;
        const step = this.steps[index];
        const body = this.overlay.querySelector('.zenweb-wizard-body');
        body.innerHTML = '';

        const stepTitle = document.createElement('h3');
        stepTitle.textContent = step.title;
        body.appendChild(stepTitle);

        step.inputs.forEach(input => {
            const wrapper = document.createElement('div');
            wrapper.className = 'zenweb-wizard-field';

            // Clone label
            const id = input.id;
            let labelText = '';
            if (id) {
                const label = this.originalForm.querySelector(`label[for="${id}"]`);
                if (label) labelText = label.innerText;
            }
            // Fallback to placeholder or parent text
            if (!labelText) labelText = input.placeholder || input.name || 'Field';

            const labelEl = document.createElement('label');
            labelEl.textContent = labelText;
            wrapper.appendChild(labelEl);

            // Clone input (deep clone to keep attributes)
            // But we need to sync value back to original!
            const clonedInput = input.cloneNode(true);
            clonedInput.value = input.value;
            clonedInput.addEventListener('input', (e) => {
                input.value = e.target.value;
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            });
            wrapper.appendChild(clonedInput);

            body.appendChild(wrapper);
        });

        // Update UI
        this.overlay.querySelector('#wiz-step-num').textContent = index + 1;
        this.overlay.querySelector('#wiz-total-steps').textContent = this.steps.length;

        const progress = ((index + 1) / this.steps.length) * 100;
        this.overlay.querySelector('.zenweb-wizard-progress-fill').style.width = `${progress}%`;

        this.overlay.querySelector('.zenweb-wizard-prev').disabled = index === 0;

        const nextBtn = this.overlay.querySelector('.zenweb-wizard-next');
        if (index === this.steps.length - 1) {
            nextBtn.textContent = 'Finish';
        } else {
            nextBtn.textContent = 'Next';
        }
    }

    prevStep() {
        if (this.currentStep > 0) {
            this.renderStep(this.currentStep - 1);
        }
    }

    nextStep() {
        if (this.currentStep < this.steps.length - 1) {
            this.renderStep(this.currentStep + 1);
        } else {
            this.finish();
        }
    }

    finish() {
        // Trigger submit on original form if valid
        // For now just close
        this.stop();
        // Optional: this.originalForm.submit(); or show success toast
        alert('Form completed! Please submit the original form if not auto-submitted.');
    }
}
