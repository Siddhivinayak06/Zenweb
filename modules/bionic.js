class BionicManager {
    constructor() {
        this.isActive = false;
        this.observer = null;
    }

    enable() {
        if (this.isActive) return;
        this.isActive = true;
        this.processPage();

        // Optional: Observe mutations to handle infinite scrolling
        // this.startObserver(); 
    }

    disable() {
        if (!this.isActive) return;
        this.isActive = false;
        this.removeBionicReading(document.body);
        // this.stopObserver();
    }

    processPage() {
        // Avoid processing hidden content or scripts/styles
        const target = document.body;
        this.applyBionicReading(target);
    }

    applyBionicReading(container) {
        if (!container) return;

        // Tags to skip
        const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'SVG', 'CODE', 'PRE', 'TEXTAREA', 'INPUT'];

        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    const parent = node.parentNode;
                    if (!parent) return NodeFilter.FILTER_REJECT;
                    if (skipTags.includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
                    if (parent.isContentEditable) return NodeFilter.FILTER_REJECT;
                    if (parent.classList.contains('bionic-processed')) return NodeFilter.FILTER_REJECT;
                    return NodeFilter.FILTER_ACCEPT;
                }
            },
            false
        );

        const textNodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.textContent.trim().length > 0) {
                textNodes.push(walker.currentNode);
            }
        }

        textNodes.forEach(node => {
            const text = node.textContent;
            // Skip very short text nodes to avoid performance hit on tiny spacers
            if (text.length < 2) return;

            const words = text.split(/(\s+)/); // Split but keep whitespace

            const fragment = document.createDocumentFragment();
            let hasChanges = false;

            words.forEach(word => {
                if (/^\s+$/.test(word)) {
                    fragment.appendChild(document.createTextNode(word));
                } else if (word.length > 0) {
                    hasChanges = true;
                    // Bold calculation: ~40% of word length
                    let boldLength = 1;
                    if (word.length > 3) boldLength = Math.ceil(word.length * 0.4);

                    const boldPart = word.substring(0, boldLength);
                    const normalPart = word.substring(boldLength);

                    const span = document.createElement('span');
                    span.classList.add('bionic-word');

                    const boldSpan = document.createElement('b');
                    boldSpan.className = 'bionic-bold';
                    boldSpan.textContent = boldPart;

                    span.appendChild(boldSpan);
                    span.appendChild(document.createTextNode(normalPart));

                    fragment.appendChild(span);
                }
            });

            if (hasChanges && node.parentNode) {
                const parent = node.parentNode;
                parent.classList.add('bionic-processed'); // Mark parent to prevent re-processing
                parent.replaceChild(fragment, node);
            }
        });
    }

    removeBionicReading(container) {
        if (!container) return;

        // This is tricky. Reversing exactly is hard if we don't store original.
        // Simplified approach: Target .bionic-word spans and unwrap them.
        const words = container.querySelectorAll('.bionic-word');
        words.forEach(span => {
            const parent = span.parentNode;
            if (parent) {
                // Text is just the textContent of the span (bold + normal)
                const text = document.createTextNode(span.textContent);
                parent.replaceChild(text, span);
                parent.classList.remove('bionic-processed');
            }
        });

        // Normalize to merge adjacent text nodes created by unwrapping
        container.normalize();
    }
}
