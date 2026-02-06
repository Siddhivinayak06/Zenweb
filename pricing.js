// pricing.js - Handles Stripe Payment Link redirect

document.addEventListener('DOMContentLoaded', () => {
    const paymentLink = window.ZenWebConfig?.STRIPE_PAYMENT_LINK;

    if (!paymentLink) {
        console.error("ZenWeb: Payment Link missing in config.js");
    }

    // 1. Handle Upgrade Click - Simple Redirect to Payment Link
    const upgradeBtn = document.getElementById('btn-upgrade-pro');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', (e) => {
            e.preventDefault();

            if (!paymentLink) {
                alert("Payment not configured. Please contact support.");
                return;
            }

            // Redirect to Stripe Payment Link
            window.open(paymentLink, '_blank');
        });
    }

    // 2. Handle Return from Stripe (if user manually returns)
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('success') === 'true') {
        document.body.innerHTML = `
            <div class="container" style="text-align:center; padding-top:100px;">
                <h1 style="color:#10b981">Payment Successful! 🎉</h1>
                <p class="subtitle">Activating your Pro license...</p>
                <div class="spinner" style="font-size:40px">⏳</div>
            </div>
        `;

        // Call Background to upgrade user
        if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'simulate_upgrade' }, (response) => {
                setTimeout(() => {
                    document.body.innerHTML = `
                        <div class="container" style="text-align:center; padding-top:100px;">
                            <h1 style="color:#10b981">You are now Pro! 🚀</h1>
                            <p class="subtitle">Close this tab and refresh the extension.</p>
                            <button onclick="window.close()" class="cta-btn btn-pro" style="max-width:200px; margin:20px auto;">Close Page</button>
                        </div>
                    `;
                }, 2000);
            });
        }
    }

    if (urlParams.get('canceled') === 'true') {
        alert("Payment canceled. You have not been charged.");
    }
});
