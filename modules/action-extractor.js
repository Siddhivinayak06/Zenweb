export class ActionExtractor {
    constructor() {
        this.patterns = {
            // Dates: DD/MM/YYYY, 15th Jan, Next Friday, etc.
            dateFormats: /\b(\d{1,2}(st|nd|rd|th)?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(\s+\d{4})?|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/gi,
            relativeTime: /\b(next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)|tomorrow|today|tonight|eod|end of day)\b/gi,

            // Imperatives: Start with verb, imply action
            imperatives: /^(submit|call|email|pay|buy|schedule|book|review|complete|finish|upload|send|reply|check|verify)\b/i,

            // Interaction: "Click here", "Sign up" (often noise, we filter these)
            navigational: /^(click|sign|log|read|view|browse|skip|cancel)\b/i,

            // Context clues
            actionPhrases: /\b(to-do|action items?|next steps?|deadline|due date|requirements?)\b/i
        };
    }

    scan(text) {
        if (!text) return [];

        const lines = text.split('\n');
        const actions = [];

        // Context tracking
        let isListContext = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (!trimmed) return;

            // 1. Check for dates/deadlines (High value)
            const deadlines = this.extractDates(trimmed);

            // 2. Check for imperative start (Actionable)
            const isImperative = this.patterns.imperatives.test(trimmed);

            // 3. Check if it looks like a list item
            const isListItem = /^[•\-*\\d\\.]+\s/.test(trimmed);

            // Heuristics for "Action-ness"
            let score = 0;
            if (isImperative) score += 5;
            if (deadlines.length > 0) score += 4;
            if (trimmed.toLowerCase().includes('deadline') || trimmed.toLowerCase().includes('due')) score += 3;
            if (isListItem && isListContext) score += 2; // Continuity

            // Filter out navigation noise
            if (this.patterns.navigational.test(trimmed)) score -= 3;

            // If it qualifies as an action
            if (score >= 4 || (isListItem && score >= 2 && isListContext)) {
                actions.push({
                    original: trimmed,
                    text: this.cleanText(trimmed),
                    type: deadlines.length > 0 ? 'deadline' : 'task',
                    dates: deadlines,
                    verbatim: isImperative && !isListItem, // Was it a direct command?
                    priority: (deadlines.length > 0 || trimmed.toLowerCase().includes('important')) ? 'high' : 'normal'
                });

                if (isListItem) isListContext = true;
            } else {
                // Reset context if we hit a non-action paragraph
                if (trimmed.length > 100) isListContext = false;
            }

            // Check for section headers that imply lists
            if (this.patterns.actionPhrases.test(trimmed)) {
                isListContext = true;
            }
        });

        return this.deduplicate(actions).slice(0, 10); // Limit to top 10
    }

    extractDates(text) {
        const matches = [];
        let match;

        // Reset lastIndex
        this.patterns.dateFormats.lastIndex = 0;
        this.patterns.relativeTime.lastIndex = 0;

        // Absolute dates
        while ((match = this.patterns.dateFormats.exec(text)) !== null) {
            matches.push(match[0]);
        }

        // Relative dates
        while ((match = this.patterns.relativeTime.exec(text)) !== null) {
            matches.push(match[0]);
        }

        return matches;
    }

    cleanText(text) {
        return text
            .replace(/^[•\-*]\s+/, '') // Remove bullets
            .replace(/^\d+[\.\)]\s+/, '') // Remove numbers
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();
    }

    deduplicate(actions) {
        const seen = new Set();
        return actions.filter(a => {
            const key = a.text.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // PRO FEATURE: Export Stub
    exportToService(service, tasks) {
        console.log(`[Pro] Exporting ${tasks.length} tasks to ${service}...`);
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({ success: true, count: tasks.length, service });
            }, 1000);
        });
    }
}

export const actionExtractor = new ActionExtractor();
