class SpeechManager {
    constructor() {
        this.isSpeaking = false;
        this.speechUtterance = null;
        this.preferredVoiceName = 'auto';

        // Load preference
        chrome.storage.local.get(['preferredVoice'], (result) => {
            if (result.preferredVoice) this.preferredVoiceName = result.preferredVoice;
        });

        // Listen for changes
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.preferredVoice) {
                this.preferredVoiceName = changes.preferredVoice.newValue;
            }
        });
    }

    toggleSpeech(text, onStart, onStop) {
        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
            if (onStop) onStop();
        } else {
            this.speak(text, onStart, onStop);
        }
    }

    speak(text, onStart, onStop) {
        window.speechSynthesis.cancel(); // Clear queue

        // Chunk text to avoid 15-second timeout in Chrome TTS
        const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];
        let currentSentenceIndex = 0;

        const speakNextChunk = () => {
            if (currentSentenceIndex >= sentences.length) {
                this.isSpeaking = false;
                if (onStop) onStop();
                return;
            }

            const chunk = sentences[currentSentenceIndex].trim();
            if (chunk.length === 0) {
                currentSentenceIndex++;
                speakNextChunk();
                return;
            }

            this.speechUtterance = new SpeechSynthesisUtterance(chunk);

            // Re-apply voice logic for each chunk
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) this.setBestVoice(this.speechUtterance, voices);

            this.speechUtterance.rate = 1.05;
            this.speechUtterance.pitch = 1.0;

            this.speechUtterance.onend = () => {
                currentSentenceIndex++;
                if (this.isSpeaking) speakNextChunk();
            };

            this.speechUtterance.onerror = (e) => {
                console.error("ZenWeb: TTS Chunk Error", e);
                // Try skipping to next chunk on error instead of aborting
                currentSentenceIndex++;
                if (this.isSpeaking) speakNextChunk();
            };

            window.speechSynthesis.speak(this.speechUtterance);
        };

        // Ensure voices loaded
        let voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            window.speechSynthesis.onvoiceschanged = () => {
                if (!this.isSpeaking) return;
                voices = window.speechSynthesis.getVoices();
                speakNextChunk();
            };
        }

        this.isSpeaking = true;
        if (onStart) onStart();

        if (voices.length > 0) {
            speakNextChunk();
        }
    }

    stop() {
        if (this.isSpeaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
        }
    }

    setBestVoice(utterance, voices) {
        let selectedVoice = null;

        // 1. User Preference
        if (this.preferredVoiceName && this.preferredVoiceName !== 'auto') {
            selectedVoice = voices.find(v => v.name === this.preferredVoiceName);
        }

        // 2. Auto Ranking (if no preference or "auto")
        if (!selectedVoice) {
            // Ranking strategy: Google Premium/Natural -> Google Standard -> Apple Samantha/Daniel -> Microsoft -> Default
            const preferredAppellations = [
                'Google US English',
                'Google UK English',
                'Samantha',
                'Daniel',
                'Microsoft',
                'English'
            ];

            for (const name of preferredAppellations) {
                selectedVoice = voices.find(v => v.name.includes(name));
                if (selectedVoice) break;
            }
        }

        // 3. Fallback
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith('en')) || voices[0];
        }

        if (selectedVoice) {
            // console.log("ZenWeb: Selected Voice:", selectedVoice.name);
            utterance.voice = selectedVoice;
        }
    }
}
