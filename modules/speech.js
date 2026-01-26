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

        // Chunk text to avoid 15-second timeout in Chrome TTS and memory limits
        const chunks = this.getChunks(text, 200); // 200 chars safe limit
        let currentChunkIndex = 0;

        const speakNextChunk = () => {
            if (currentChunkIndex >= chunks.length) {
                this.isSpeaking = false;
                if (onStop) onStop();
                return;
            }

            const chunkText = chunks[currentChunkIndex].trim();
            if (chunkText.length === 0) {
                currentChunkIndex++;
                speakNextChunk();
                return;
            }

            // Create utterance for this chunk
            this.speechUtterance = new SpeechSynthesisUtterance(chunkText);

            // Re-apply voice logic for each chunk (persistence fix)
            let voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) this.setBestVoice(this.speechUtterance, voices);

            this.speechUtterance.rate = 1.0; // Slightly slower for better comprehension
            this.speechUtterance.pitch = 1.0;

            this.speechUtterance.onend = () => {
                currentChunkIndex++;
                if (this.isSpeaking) speakNextChunk();
            };

            this.speechUtterance.onerror = (e) => {
                console.warn("ZenWeb: TTS Chunk Error", e);

                // If the error is 'interrupted' (user cancelled), stop.
                if (e.error === 'interrupted') {
                    this.isSpeaking = false;
                    return;
                }

                // Otherwise, try to skip to the next chunk
                currentChunkIndex++;
                if (this.isSpeaking) {
                    // Small delay to let the engine recover
                    setTimeout(() => speakNextChunk(), 50);
                }
            };

            try {
                window.speechSynthesis.speak(this.speechUtterance);
            } catch (err) {
                currentChunkIndex++;
                speakNextChunk();
            }
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
    getChunks(text, maxLength) {
        if (!text) return [];

        const chunks = [];
        // First split by common sentence delimiters to respect grammar
        const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [text];

        for (let sentence of sentences) {
            sentence = sentence.trim();
            if (sentence.length <= maxLength) {
                chunks.push(sentence);
            } else {
                // Sentence too long, split by words
                const words = sentence.split(/\s+/);
                let currentChunk = "";

                for (const word of words) {
                    if ((currentChunk + word).length < maxLength) {
                        currentChunk += (currentChunk ? " " : "") + word;
                    } else {
                        if (currentChunk) chunks.push(currentChunk);
                        currentChunk = word;
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
            }
        }
        return chunks;
    }
}

