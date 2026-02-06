/**
 * ZenWeb Landing – Smooth scroll & fade-in on scroll
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

    // Fade-in on scroll
    const fadeElements = document.querySelectorAll(
        '.about__card, .feature-card, .how__step, .a11y__content, .section--opensource .container > *, .section--cta .container'
    );

    function addFadeClass() {
        fadeElements.forEach(function (el) {
            el.classList.add('fade-in');
        });
    }

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

    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        fadeElements.forEach(function (el) {
            el.classList.add('visible');
        });
    } else {
        observeFade();
    }
})();
