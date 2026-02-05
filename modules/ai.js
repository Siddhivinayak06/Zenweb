class AIManager {
    constructor() {
        this.ollamaUrl = 'http://localhost:11434/api/generate';
        this.model = 'llama3.1';
    }

    async summarizePage() {
        const mainContent = this.findMainContent();

        // Form Summarization Logic
        if (mainContent.tagName === 'FORM' || mainContent.querySelector('form')) {
            return ["Form detected. AI summary not applicable."];
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

        return document.body;
    }

    async summarizeText(text) {
        const truncatedText = text.substring(0, 15000); // Expanding context window
        const prompt = `Summarize the following article in 3 distinct, concise bullet points (Start each with "• "). Focus on the main ideas:\n\n${truncatedText}`;

        try {
            const response = await this.callOllama(prompt);
            if (response) {
                // Parse bullet points
                return response.split('\n')
                    .map(line => line.trim().replace(/^[-•*]\s*/, ''))
                    .filter(line => line.length > 10);
            }
        } catch (e) {
            console.error("ZenWeb: Ollama summary failed", e);
        }

        // Fallback: Simple heuristic
        return this.fallbackSummary(text);
    }

    async extractActionItems(text) {
        const truncatedText = text.substring(0, 15000);
        const prompt = `Identify actionable tasks or to-do items in the following text. Return them as a JSON array of strings. If none, return [].\n\nText:\n${truncatedText}`;
        try {
            const response = await this.callOllama(prompt);
            // Attempt to parse JSON from response (Ollama might add chatter)
            const jsonMatch = response.match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            // Fallback: split by lines if it looks like a list
            return response.split('\n').filter(line => line.trim().length > 0).map(l => l.replace(/^[-*•\d\.]+\s*/, ''));
        } catch (e) {
            console.error("ZenWeb: Action extraction failed", e);
            return [];
        }
    }

    async simplifyText(text) {
        const prompt = `Rewrite the following text at a 5th-grade reading level. Keep it concise:\n\n${text}`;
        return await this.callOllama(prompt);
    }

    async defineTerm(term, context) {
        const prompt = `Define the term "${term}" in simple, plain English. Context: "${context}". Keep definition under 20 words.`;
        return await this.callOllama(prompt);
    }

    async callOllama(prompt) {
        try {
            const response = await fetch(this.ollamaUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt: prompt,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data = await response.json();
            return data.response;
        } catch (e) {
            console.error("ZenWeb: Failed to call Ollama.", e);
            return null;
        }
    }

    fallbackSummary(text) {
        console.log("ZenWeb: Using fallback analytics.");
        const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
        if (sentences.length <= 3) return sentences.length > 0 ? sentences : ["No significant content found."];

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

