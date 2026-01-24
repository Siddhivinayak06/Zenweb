class AIManager {
    constructor() {
        // AI logic doesn't need much state, mostly utility methods
    }

    async summarizePage() {
        const mainContent = this.findMainContent();

        // Form Summarization Logic
        if (mainContent.tagName === 'FORM' || mainContent.querySelector('form')) {
            return ["Form detected. AI summary not applicable."]; // Simplified for now
        }

        // Article/Text Summarization Logic
        let textToSummarize = mainContent.innerText;
        try {
            const documentClone = document.cloneNode(true);
            const article = new Readability(documentClone).parse();
            if (article && article.textContent) {
                textToSummarize = article.textContent;
            }
        } catch (e) {
            console.warn("ZenWeb: Readability check failed using raw text", e);
        }

        return await this.summarizeText(textToSummarize);
    }

    findMainContent() {
        // Heuristic 1: <article> tag
        const articles = document.querySelectorAll('article');
        for (let article of articles) {
            if (article.innerText.length > 600) return article;
        }

        // Heuristic 2: <main> tag
        const main = document.querySelector('main');
        if (main && main.innerText.length > 600) return main;

        // Heuristic 3: Density Scoring (Simplified from original for brevity or we can keep full logic)
        // For refactoring, we'll keep the full logic in the module if needed, or rely on Readability
        // Let's rely on Readability mostly, but fallback to body
        return document.body;
    }

    async summarizeText(text) {
        // Priority 1: On-Device AI (Gemini Nano)
        if (window.ai && window.ai.languageModel) {
            try {
                const capabilities = await window.ai.languageModel.capabilities();
                if (capabilities.available !== 'no') {
                    console.log("ZenWeb: Using On-Device AI");
                    const session = await window.ai.languageModel.create();

                    const truncatedText = text.substring(0, 10000);
                    const prompt = `Summarize the following article in 3 distinct, concise bullet points (Start each with "• "). Focus on the main ideas:\n\n${truncatedText}`;

                    const result = await session.prompt(prompt);
                    return result.split('\n').map(line => line.trim().replace(/^•\s*/, '')).filter(line => line.length > 0);
                }
            } catch (e) {
                console.error("ZenWeb: On-Device AI failed, falling back to Cloud.", e);
            }
        }

        // Priority 2: Cloud API (Gemini via Background)
        try {
            console.log("ZenWeb: Attempting Cloud API");
            const cloudSummary = await new Promise((resolve) => {
                chrome.runtime.sendMessage({
                    action: 'summarize_with_api',
                    text: text.substring(0, 20000)
                }, (response) => {
                    if (chrome.runtime.lastError || response?.error) {
                        resolve(null);
                    } else {
                        resolve(response.summary);
                    }
                });
            });

            if (cloudSummary && cloudSummary.length > 0) return cloudSummary;
        } catch (e) {
            console.error("ZenWeb: Cloud API error", e);
        }

        // Priority 3: Fallback Heuristics
        console.log("ZenWeb: Using fallback analytics.");
        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
        if (sentences.length <= 3) return sentences.length > 0 ? sentences : ["No significant content found."];

        // Simple scoring based on word frequency
        const wordCounts = {};
        const words = text.toLowerCase().match(/\w+/g) || [];
        words.forEach(w => { if (w.length > 3) wordCounts[w] = (wordCounts[w] || 0) + 1; });

        const sentenceScores = sentences.map((s, index) => {
            const sWords = s.toLowerCase().match(/\w+/g) || [];
            let score = 0;
            sWords.forEach(w => { if (wordCounts[w]) score += wordCounts[w]; });
            return { index, text: s.trim(), score: score / (sWords.length || 1) };
        });

        sentenceScores.sort((a, b) => b.score - a.score);
        return sentenceScores.slice(0, 3).sort((a, b) => a.index - b.index).map(s => s.text);
    }
}
