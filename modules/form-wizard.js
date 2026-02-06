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

/**
 * GoogleFormsHelper - Specialized accessibility features for Google Forms
 * Provides question-by-question focus, read aloud, and AI assistance
 */
class GoogleFormsHelper {
    constructor(speechManager) {
        this.isActive = false;
        this.currentQuestionIndex = 0;
        this.questions = [];
        this.speechManager = speechManager;
        this.controlBar = null;
    }

    /**
     * Check if current page is a Google Form
     */
    static isGoogleForm() {
        return window.location.hostname === 'docs.google.com' &&
            window.location.pathname.includes('/forms/');
    }

    /**
     * Initialize the helper - called when on a Google Form
     */
    init() {
        if (!GoogleFormsHelper.isGoogleForm()) return;

        this.parseQuestions();
        // Always create control bar on Google Forms, even with 0 questions initially
        // (questions might load dynamically)
        this.createControlBar();
        this.isActive = true;

        if (this.questions.length > 0) {
            this.showToast(`📝 Form Mode: ${this.questions.length} questions detected`);
        } else {
            this.showToast(`📝 Form Helper Active - Looking for questions...`);
            // Retry after a delay in case form loads dynamically
            setTimeout(() => {
                this.parseQuestions();
                if (this.questions.length > 0) {
                    this.updateProgress();
                    this.showToast(`📝 Found ${this.questions.length} questions`);
                }
            }, 2000);
        }
    }

    /**
     * Parse all questions from the Google Form
     */
    parseQuestions() {
        // Google Forms uses multiple selectors depending on form type
        // Try multiple selectors to find question blocks
        let questionBlocks = document.querySelectorAll('[data-item-id]');

        // Fallback selectors for different Google Forms layouts
        if (questionBlocks.length === 0) {
            questionBlocks = document.querySelectorAll('.freebirdFormviewerViewNumberedItemContainer');
        }
        if (questionBlocks.length === 0) {
            questionBlocks = document.querySelectorAll('.Qr7Oae');
        }
        if (questionBlocks.length === 0) {
            // Try to find any element with role='listitem' within form
            questionBlocks = document.querySelectorAll('[role="listitem"]');
        }

        this.questions = [];

        questionBlocks.forEach((block, index) => {
            // Get question text - try multiple selectors
            const questionTextEl = block.querySelector('[role="heading"]') ||
                block.querySelector('.M7eMe') ||
                block.querySelector('.freebirdFormviewerComponentsQuestionBaseTitle') ||
                block.querySelector('.HoXoMd') ||
                block.querySelector('span[dir="auto"]');

            // Get required indicator
            const isRequired = block.querySelector('[aria-label*="Required"]') !== null ||
                block.textContent.includes('*');

            // Get input type
            const hasRadio = block.querySelector('input[type="radio"]');
            const hasCheckbox = block.querySelector('input[type="checkbox"]');
            const hasText = block.querySelector('input[type="text"], textarea');
            const hasDropdown = block.querySelector('[role="listbox"]');

            let inputType = 'unknown';
            if (hasRadio) inputType = 'radio';
            else if (hasCheckbox) inputType = 'checkbox';
            else if (hasText) inputType = 'text';
            else if (hasDropdown) inputType = 'dropdown';

            // Get options if multiple choice
            const options = [];
            if (hasRadio || hasCheckbox) {
                const optionEls = block.querySelectorAll('[data-value]');
                optionEls.forEach(opt => {
                    options.push(opt.getAttribute('data-value') || opt.textContent.trim());
                });
            }

            this.questions.push({
                index: index,
                element: block,
                text: questionTextEl?.textContent.trim() || `Question ${index + 1}`,
                isRequired: isRequired,
                inputType: inputType,
                options: options,
                isAnswered: false
            });
        });
    }

    /**
     * Create floating control bar for form navigation
     */
    createControlBar() {
        if (this.controlBar) this.controlBar.remove();

        this.controlBar = document.createElement('div');
        this.controlBar.className = 'zenweb-gform-control-bar';
        this.controlBar.innerHTML = `
            <div class="zenweb-gform-progress">
                <span class="zenweb-gform-progress-text">Question <span id="gform-current">1</span> of ${this.questions.length}</span>
                <div class="zenweb-gform-progress-bar">
                    <div class="zenweb-gform-progress-fill" style="width: 0%"></div>
                </div>
            </div>
            <div class="zenweb-gform-controls">
                <button class="zenweb-gform-btn" id="gform-prev" title="Previous Question">⬆️</button>
                <button class="zenweb-gform-btn" id="gform-next" title="Next Question">⬇️</button>
                <button class="zenweb-gform-btn" id="gform-read" title="Read Question Aloud">🔊</button>
                <button class="zenweb-gform-btn" id="gform-focus" title="Focus Mode">🎯</button>
                <button class="zenweb-gform-btn" id="gform-help" title="AI Help">🤖</button>
                <button class="zenweb-gform-btn zenweb-gform-close" id="gform-close" title="Close">✕</button>
            </div>
        `;
        document.body.appendChild(this.controlBar);

        // Bind events
        this.controlBar.querySelector('#gform-prev').addEventListener('click', () => this.prevQuestion());
        this.controlBar.querySelector('#gform-next').addEventListener('click', () => this.nextQuestion());
        this.controlBar.querySelector('#gform-read').addEventListener('click', () => this.readCurrentQuestion());
        this.controlBar.querySelector('#gform-focus').addEventListener('click', () => this.toggleFocusMode());
        this.controlBar.querySelector('#gform-help').addEventListener('click', () => this.explainCurrentQuestion());
        this.controlBar.querySelector('#gform-close').addEventListener('click', () => this.stop());

        // Keyboard navigation
        document.addEventListener('keydown', this.handleKeyNav.bind(this));

        this.isActive = true;
        this.focusQuestion(0);
    }

    /**
     * Handle keyboard navigation
     */
    handleKeyNav(e) {
        if (!this.isActive) return;

        // Alt + Arrow keys for navigation
        if (e.altKey) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.prevQuestion();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.nextQuestion();
            } else if (e.key === 'r' || e.key === 'R') {
                e.preventDefault();
                this.readCurrentQuestion();
            }
        }
    }

    /**
     * Focus on a specific question
     */
    focusQuestion(index) {
        if (index < 0 || index >= this.questions.length) return;

        // Remove previous highlight
        this.questions.forEach(q => {
            q.element.classList.remove('zenweb-gform-highlight');
        });

        this.currentQuestionIndex = index;
        const question = this.questions[index];

        // Highlight current question
        question.element.classList.add('zenweb-gform-highlight');

        // Scroll into view with smooth animation
        question.element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Update progress
        this.updateProgress();

        // Focus the first input in this question
        const firstInput = question.element.querySelector('input, textarea, [role="listbox"]');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 300);
        }
    }

    /**
     * Update progress bar and counter
     */
    updateProgress() {
        const current = this.controlBar.querySelector('#gform-current');
        const progressFill = this.controlBar.querySelector('.zenweb-gform-progress-fill');

        current.textContent = this.currentQuestionIndex + 1;
        const percentage = ((this.currentQuestionIndex + 1) / this.questions.length) * 100;
        progressFill.style.width = `${percentage}%`;
    }

    /**
     * Navigate to previous question
     */
    prevQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.focusQuestion(this.currentQuestionIndex - 1);
        }
    }

    /**
     * Navigate to next question
     */
    nextQuestion() {
        if (this.currentQuestionIndex < this.questions.length - 1) {
            this.focusQuestion(this.currentQuestionIndex + 1);
        }
    }

    /**
     * Read current question aloud using Speech API
     */
    readCurrentQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        let textToRead = question.text;

        // Add required indicator
        if (question.isRequired) {
            textToRead = 'Required question: ' + textToRead;
        }

        // Add options if multiple choice
        if (question.options.length > 0) {
            textToRead += '. Options are: ' + question.options.join(', ');
        }

        // Use SpeechManager if available, otherwise use Web Speech API directly
        if (this.speechManager && this.speechManager.speak) {
            this.speechManager.speak(textToRead);
        } else {
            const utterance = new SpeechSynthesisUtterance(textToRead);
            utterance.rate = 0.9;
            utterance.pitch = 1;
            speechSynthesis.speak(utterance);
        }

        // Visual feedback
        this.showToast('🔊 Reading question...');
    }

    /**
     * Toggle focus mode - dim everything except current question
     */
    toggleFocusMode() {
        document.body.classList.toggle('zenweb-gform-focus-mode');
        const btn = this.controlBar.querySelector('#gform-focus');
        btn.classList.toggle('active');

        if (document.body.classList.contains('zenweb-gform-focus-mode')) {
            this.showToast('🎯 Focus Mode ON');
        } else {
            this.showToast('🎯 Focus Mode OFF');
        }
    }

    /**
     * Use AI to explain the current question
     */
    async explainCurrentQuestion() {
        const question = this.questions[this.currentQuestionIndex];

        this.showToast('🤖 Getting AI help...');

        try {
            // Send message to background for AI processing
            chrome.runtime.sendMessage({
                action: 'explain_form_question',
                question: question.text,
                options: question.options,
                inputType: question.inputType
            }, (response) => {
                if (response && response.explanation) {
                    this.showExplanationPopup(response.explanation);
                } else if (response && response.error) {
                    this.showToast('❌ ' + response.error.message);
                }
            });
        } catch (error) {
            this.showToast('❌ Could not get AI help');
        }
    }

    /**
     * Show explanation popup near the question
     */
    showExplanationPopup(explanation) {
        // Remove existing popup
        const existing = document.querySelector('.zenweb-gform-explanation');
        if (existing) existing.remove();

        const question = this.questions[this.currentQuestionIndex];

        const popup = document.createElement('div');
        popup.className = 'zenweb-gform-explanation';
        popup.innerHTML = `
            <div class="zenweb-gform-explanation-header">
                <span>🤖 AI Explanation</span>
                <button class="zenweb-gform-explanation-close">✕</button>
            </div>
            <div class="zenweb-gform-explanation-content">
                ${explanation}
            </div>
            <button class="zenweb-gform-explanation-read">🔊 Read Aloud</button>
        `;

        question.element.appendChild(popup);

        popup.querySelector('.zenweb-gform-explanation-close').addEventListener('click', () => popup.remove());
        popup.querySelector('.zenweb-gform-explanation-read').addEventListener('click', () => {
            const utterance = new SpeechSynthesisUtterance(explanation);
            utterance.rate = 0.9;
            speechSynthesis.speak(utterance);
        });
    }

    /**
     * Show toast notification
     */
    showToast(message) {
        let toast = document.querySelector('.zenweb-gform-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'zenweb-gform-toast';
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    /**
     * Stop and cleanup
     */
    stop() {
        this.isActive = false;

        // Remove highlight from all questions
        this.questions.forEach(q => {
            q.element.classList.remove('zenweb-gform-highlight');
        });

        // Remove focus mode
        document.body.classList.remove('zenweb-gform-focus-mode');

        // Remove control bar
        if (this.controlBar) {
            this.controlBar.remove();
            this.controlBar = null;
        }

        // Remove any explanation popups
        document.querySelectorAll('.zenweb-gform-explanation').forEach(el => el.remove());
    }
}

// Export for use in content.js
if (typeof window !== 'undefined') {
    window.GoogleFormsHelper = GoogleFormsHelper;
}
