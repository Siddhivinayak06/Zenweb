/**
 * ZenWeb Landing – Smooth scroll, fade-in, disorder card interactions
 */

(function () {
    'use strict';

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Disorder card interactions – click to expand/collapse
    const disorderCards = document.querySelectorAll('.disorder-card');
    const disorderPanels = document.querySelectorAll('.disorder-features__panel');

    disorderCards.forEach(function (card) {
        card.addEventListener('click', function () {
            const disorder = this.getAttribute('data-disorder');
            const panelId = disorder + '-features';
            const panel = document.getElementById(panelId);
            const isExpanded = this.getAttribute('aria-expanded') === 'true';

            // Hide all panels and deactivate all cards
            disorderPanels.forEach(function (p) {
                p.hidden = true;
            });
            disorderCards.forEach(function (c) {
                c.setAttribute('aria-expanded', 'false');
                c.classList.remove('active');
            });

            // If was collapsed, show this panel; otherwise leave all hidden
            if (!isExpanded && panel) {
                panel.hidden = false;
                this.setAttribute('aria-expanded', 'true');
                this.classList.add('active');
            }
        });
    });

    // Fade-in on scroll
    const fadeElements = document.querySelectorAll(
        '.about__content, .disorder-cards, .disorder-feature, .how__step, .a11y__content, .section--opensource .container > *, .section--cta .container'
    );

    function observeFade() {
        const observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
        );

        fadeElements.forEach(function (el) {
            el.classList.add('fade-in');
            observer.observe(el);
        });
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        fadeElements.forEach(function (el) {
            el.classList.add('visible');
        });
    } else {
        observeFade();
    }
})();
