/**
 * SiBangku High-Performance Hospitality Experience Engine
 * - Anime.js Scroll & Interactive Animations
 * - Cross-Device Camera QR Scanner (Mobile Phone + Laptop Webcam)
 * - Language Preference Storage
 */

(function () {
    // ------------------------------------------------------------------------
    // 1. Audio & Visual Cues
    // ------------------------------------------------------------------------
    function playScanSuccessTone() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12); // E6
            gain.gain.setValueAtTime(0.2, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
        } catch (e) {
            // AudioContext not allowed or not supported
        }
    }

    // ------------------------------------------------------------------------
    // 2. Camera QR Code Scanner (Universal Mobile & Laptop Webcam Engine)
    // ------------------------------------------------------------------------
    let html5QrScannerInstance = null;
    let currentScanningDotNetHelper = null;
    let currentCallbackMethodName = null;
    let activeCameraId = null;

    function extractTenantCode(rawText) {
        if (!rawText) return '';
        rawText = rawText.trim();

        // 1. Check if URL contains ?tenant= or &tenant=
        const tenantMatch = rawText.match(/[?&]tenant=([a-zA-Z0-9_-]+)/i);
        if (tenantMatch && tenantMatch[1]) {
            return tenantMatch[1].toUpperCase();
        }

        // 2. Check if URL contains /booking/CODE or /resto/CODE
        const pathMatch = rawText.match(/\/(?:booking|resto|outlet|tenant)\/([a-zA-Z0-9_-]+)/i);
        if (pathMatch && pathMatch[1]) {
            return pathMatch[1].toUpperCase();
        }

        // 3. Check if JSON formatted { "tenant": "XYZ" }
        if (rawText.startsWith('{') && rawText.endsWith('}')) {
            try {
                const parsed = JSON.parse(rawText);
                if (parsed.tenant) return String(parsed.tenant).toUpperCase();
                if (parsed.tenantCode) return String(parsed.tenantCode).toUpperCase();
                if (parsed.code) return String(parsed.code).toUpperCase();
            } catch (e) { }
        }

        // 4. If plain alphanumeric code (e.g. GRAND-BISTRO, PADANG-MERDEKA)
        const cleanCode = rawText.replace(/[^a-zA-Z0-9_-]/g, '');
        if (cleanCode.length >= 2 && cleanCode.length <= 40) {
            return cleanCode.toUpperCase();
        }

        return rawText.toUpperCase();
    }

    window.SiBangkuQr = {
        getAvailableCameras: async function () {
            try {
                if (typeof Html5Qrcode === 'undefined') {
                    return [];
                }
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length) {
                    return devices.map((d, index) => ({
                        id: d.id,
                        label: d.label || `Kamera ${index + 1}`
                    }));
                }
                return [];
            } catch (err) {
                return [];
            }
        },

        startScanner: async function (containerId, dotNetHelper, callbackMethod, preferredCameraId) {
            currentScanningDotNetHelper = dotNetHelper;
            currentCallbackMethodName = callbackMethod || 'OnQrCodeScanned';

            const container = document.getElementById(containerId);
            if (!container) {
                return { success: false, error: 'Container element not found' };
            }

            // Stop previous instance if still running
            await window.SiBangkuQr.stopScanner();

            try {
                html5QrScannerInstance = new Html5Qrcode(containerId, {
                    verbose: false,
                    formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE]
                });

                const qrConfig = {
                    fps: 15,
                    qrbox: function (viewfinderWidth, viewfinderHeight) {
                        const edge = Math.min(viewfinderWidth, viewfinderHeight);
                        const boxSize = Math.floor(edge * 0.72);
                        return { width: Math.max(boxSize, 180), height: Math.max(boxSize, 180) };
                    },
                    aspectRatio: 1.0
                };

                const onScanSuccess = async (decodedText, decodedResult) => {
                    const code = extractTenantCode(decodedText);
                    playScanSuccessTone();

                    if (window.SiBangkuAnime && typeof window.SiBangkuAnime.triggerScanSuccessAnimation === 'function') {
                        window.SiBangkuAnime.triggerScanSuccessAnimation(containerId);
                    }

                    // Release camera immediately on match
                    await window.SiBangkuQr.stopScanner();

                    if (currentScanningDotNetHelper && currentCallbackMethodName) {
                        currentScanningDotNetHelper.invokeMethodAsync(currentCallbackMethodName, code);
                    }
                };

                const onScanFailure = (error) => {
                    // Ignore frame-by-frame decoding miss
                };

                // Device selection strategy:
                // 1. If explicit camera ID provided, use it
                // 2. Otherwise try { facingMode: "environment" } (mobile rear camera)
                // 3. Fallback gracefully to laptop webcam / any available camera
                if (preferredCameraId) {
                    activeCameraId = preferredCameraId;
                    await html5QrScannerInstance.start(preferredCameraId, qrConfig, onScanSuccess, onScanFailure);
                } else {
                    try {
                        // Ideal for smartphones
                        await html5QrScannerInstance.start({ facingMode: "environment" }, qrConfig, onScanSuccess, onScanFailure);
                    } catch (mobileRearErr) {
                        // Laptop webcam or single camera fallback
                        await html5QrScannerInstance.start({ facingMode: "user" }, qrConfig, onScanSuccess, onScanFailure);
                    }
                }

                return { success: true };
            } catch (err) {
                return { success: false, error: err.message || 'Camera permission denied' };
            }
        },

        switchCamera: async function (containerId, newCameraId) {
            if (!newCameraId) return;
            activeCameraId = newCameraId;
            return await window.SiBangkuQr.startScanner(containerId, currentScanningDotNetHelper, currentCallbackMethodName, newCameraId);
        },

        scanFile: async function (fileInputElementId, dotNetHelper, callbackMethod) {
            const input = document.getElementById(fileInputElementId);
            if (!input || !input.files || input.files.length === 0) {
                return;
            }
            const file = input.files[0];

            try {
                const scanner = new Html5Qrcode('qr-hidden-file-reader');
                const decodedText = await scanner.scanFile(file, true);
                const code = extractTenantCode(decodedText);
                playScanSuccessTone();

                if (dotNetHelper && callbackMethod) {
                    dotNetHelper.invokeMethodAsync(callbackMethod, code);
                }
            } catch (err) {
                alert('Gagal mendeteksi QR Code dari gambar yang diunggah. Pastikan gambar jelas dan memiliki pencahayaan baik.');
            }
        },

        stopScanner: async function () {
            if (html5QrScannerInstance) {
                try {
                    const state = html5QrScannerInstance.getState();
                    if (state === 2) { // SCANNING
                        await html5QrScannerInstance.stop();
                    }
                    html5QrScannerInstance.clear();
                } catch (e) {
                } finally {
                    html5QrScannerInstance = null;
                }
            }
        }
    };

    // ------------------------------------------------------------------------
    // 3. Scroll & Interactive Experience Engine
    // ------------------------------------------------------------------------
    window.SiBangkuScroll = {
        _initialized: false,
        _scrollHandler: null,

        init: function () {
            if (window.SiBangkuScroll._initialized && window.SiBangkuScroll._scrollHandler) {
                // Re-run an update in case DOM elements were freshly mounted
                window.SiBangkuScroll.updateScrollSpy();
                return;
            }
            window.SiBangkuScroll._initialized = true;

            var progressBar = document.getElementById('sibangku-scroll-progress');
            var backToTopBtn = document.getElementById('sibangku-back-to-top');
            var circle = backToTopBtn ? backToTopBtn.querySelector('.progress-ring-circle') : null;
            var circumference = 138;
            var sectionIds = ['hero', 'simulasi', 'keunggulan', 'alur', 'teknologi', 'cta'];
            var ticking = false;

            function getAbsoluteTop(el) {
                if (!el) return 0;
                return el.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
            }

            function onScrollUpdate() {
                var scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
                var docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                var scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

                // 1. Top Gold Progress Bar
                if (progressBar) {
                    progressBar.style.width = Math.min(100, Math.max(0, scrollPercent)) + '%';
                }

                // 2. Back-to-Top Button & Circular Ring
                if (backToTopBtn) {
                    if (scrollTop > 260) {
                        backToTopBtn.classList.add('show');
                    } else {
                        backToTopBtn.classList.remove('show');
                    }
                    if (circle) {
                        circle.style.strokeDashoffset = circumference - (scrollPercent / 100) * circumference;
                    }
                }

                // 3. Quick-Jump Scrollspy Dots & Sliding Gold Indicator Thumb
                var rail = document.getElementById('sibangku-quick-jump-rail') || document.querySelector('.ms-quick-jump-rail');
                var dots = document.querySelectorAll('.ms-quick-jump-dot');
                var thumb = document.getElementById('quick-jump-thumb');

                var heroEl = document.getElementById('hero');
                if (rail) {
                    if (!heroEl) {
                        rail.style.display = 'none';
                    } else {
                        rail.style.display = 'flex';
                    }
                }

                if (heroEl && dots.length > 0) {
                    var viewportThreshold = scrollTop + Math.min(window.innerHeight * 0.42, 380);
                    var isNearBottom = (scrollTop + window.innerHeight >= document.documentElement.scrollHeight - 60);
                    var activeIndex = 0;

                    if (isNearBottom) {
                        activeIndex = sectionIds.length - 1;
                    } else {
                        for (var i = sectionIds.length - 1; i >= 0; i--) {
                            var sec = document.getElementById(sectionIds[i]);
                            if (sec && getAbsoluteTop(sec) <= viewportThreshold) {
                                activeIndex = i;
                                break;
                            }
                        }
                    }

                    dots.forEach(function (d, idx) {
                        if (idx === activeIndex) {
                            d.classList.add('active');
                            if (thumb) {
                                var dotTop = d.offsetTop + (d.offsetHeight / 2);
                                thumb.style.top = dotTop + 'px';
                            }
                        } else {
                            d.classList.remove('active');
                        }
                    });
                }

                ticking = false;
            }

            window.SiBangkuScroll.updateScrollSpy = onScrollUpdate;

            window.SiBangkuScroll._scrollHandler = function () {
                if (!ticking) {
                    window.requestAnimationFrame(onScrollUpdate);
                    ticking = true;
                }
            };

            window.addEventListener('scroll', window.SiBangkuScroll._scrollHandler, { passive: true });

            // Initial positioning after short delay for full layout calculation
            setTimeout(onScrollUpdate, 150);

            // Smooth Anchor Scrolling for quick-jump-dots and hash anchors
            document.querySelectorAll('.ms-quick-jump-dot, a[href^="#"]').forEach(function (anchor) {
                anchor.addEventListener('click', function (e) {
                    var targetId = this.getAttribute('data-target') || this.getAttribute('href');
                    if (targetId && targetId !== '#') {
                        var targetEl = document.querySelector(targetId);
                        if (targetEl) {
                            e.preventDefault();
                            var topOffset = 70;
                            var elementPosition = targetEl.getBoundingClientRect().top;
                            var offsetPosition = elementPosition + (window.pageYOffset || window.scrollY || 0) - topOffset;
                            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

                            // Animate dot immediately
                            var dots = document.querySelectorAll('.ms-quick-jump-dot');
                            var thumb = document.getElementById('quick-jump-thumb');
                            dots.forEach(function (d) { d.classList.remove('active'); });
                            this.classList.add('active');
                            if (thumb && this.classList.contains('ms-quick-jump-dot')) {
                                var dotTop = this.offsetTop + (this.offsetHeight / 2);
                                thumb.style.top = dotTop + 'px';
                            }
                        }
                    }
                });
            });
        },

        scrollToTop: function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },

        scrollToElement: function (elementId) {
            var el = document.getElementById(elementId);
            if (el) {
                var topOffset = 70;
                var elementPosition = el.getBoundingClientRect().top;
                var offsetPosition = elementPosition + (window.pageYOffset || window.scrollY || 0) - topOffset;
                window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
            }
        }
    };

    function prefersReducedMotion() {
        return typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    window.SiBangkuAnime = {
        prefersReducedMotion: prefersReducedMotion,

        initLandingAnimations: function () {
            // Initialize global scroll listener & indicators
            if (window.SiBangkuScroll && typeof window.SiBangkuScroll.init === 'function') {
                window.SiBangkuScroll.init();
            }

            if (typeof anime === 'undefined') {
                return;
            }

            // Users who prefer reduced motion get the finished layout with no
            // entrance, scroll or looping animation. Reveal-on-scroll markers are
            // shown immediately so nothing stays hidden.
            if (prefersReducedMotion()) {
                document.querySelectorAll('.ms-scroll-divider').forEach(function (div) {
                    div.classList.add('is-revealed');
                });
                var track = document.querySelector('.step-flow-track-progress');
                if (track) track.style.width = '100%';
                return;
            }

            // A. Hero Stagger Entrance Animation (Spring Easing)
            anime.timeline({
                easing: 'easeOutExpo'
            })
            .add({
                targets: '.hero-badge-reveal',
                opacity: [0, 1],
                translateY: [-18, 0],
                duration: 750,
                delay: 100
            })
            .add({
                targets: '.hero-title-reveal',
                opacity: [0, 1],
                translateY: [35, 0],
                duration: 950
            }, '-=450')
            .add({
                targets: '.hero-desc-reveal',
                opacity: [0, 1],
                translateY: [25, 0],
                duration: 850
            }, '-=650')
            .add({
                targets: '.hero-action-reveal',
                opacity: [0, 1],
                translateY: [20, 0],
                duration: 750
            }, '-=550')
            .add({
                targets: '.hero-preview-reveal',
                opacity: [0, 1],
                scale: [0.94, 1],
                translateY: [30, 0],
                duration: 1100
            }, '-=650');

            // B. Ambient Continuous Floating Mesh Shapes

            // C. Pulse Indicator
            anime({
                targets: '.live-radar-dot',
                scale: [1, 2.4],
                opacity: [0.9, 0],
                duration: 2000,
                loop: true,
                easing: 'easeOutQuad'
            });

            // D. Scroll-Triggered Animated Reveals via IntersectionObserver
            if ('IntersectionObserver' in window) {
                const scrollObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const target = entry.target;

                            // 1. Expanding Golden Divider Hairlines
                            const dividers = target.querySelectorAll('.ms-scroll-divider');
                            dividers.forEach(div => div.classList.add('is-revealed'));

                            // 2. Animated Counter Numbers
                            if (target.classList.contains('stat-counter-section') || target.querySelector('.stat-counter-value')) {
                                target.querySelectorAll('.stat-counter-value').forEach(counterEl => {
                                    const targetVal = parseFloat(counterEl.getAttribute('data-target') || '0');
                                    const decimals = counterEl.getAttribute('data-decimals') === '1' ? 1 : 0;
                                    const prefix = counterEl.getAttribute('data-prefix') || '';
                                    const suffix = counterEl.getAttribute('data-suffix') || '';

                                    anime({
                                        targets: { val: 0 },
                                        val: targetVal,
                                        duration: 1400,
                                        easing: 'easeOutExpo',
                                        update: function (anim) {
                                            const current = anim.animations[0].currentValue;
                                            counterEl.innerHTML = prefix + (decimals ? Number(current).toFixed(1) : Math.floor(current)) + suffix;
                                        }
                                    });
                                });

                                // Animate Stat Cards
                                anime({
                                    targets: target.querySelectorAll('.stat-counter-card'),
                                    opacity: [0, 1],
                                    translateY: [25, 0],
                                    delay: anime.stagger(120),
                                    duration: 800,
                                    easing: 'easeOutCubic'
                                });
                            }

                            // 3. Product Feature Cards Stagger
                            var productCardContainer = target.classList.contains('observe-product-cards') ? target : target.querySelector('.observe-product-cards');
                            if (productCardContainer) {
                                anime({
                                    targets: productCardContainer.querySelectorAll('.product-feature-card'),
                                    opacity: [0, 1],
                                    translateY: [35, 0],
                                    scale: [0.96, 1],
                                    delay: anime.stagger(140),
                                    duration: 900,
                                    easing: 'easeOutQuart'
                                });
                            }

                            // 4. Step Flow Cards & Golden Track Fill
                            if (target.classList.contains('observe-step-flow')) {
                                const progressLine = target.querySelector('.step-flow-track-progress');
                                if (progressLine) {
                                    progressLine.style.width = '100%';
                                }

                                anime({
                                    targets: target.querySelectorAll('.step-card-elevated'),
                                    opacity: [0, 1],
                                    translateY: [35, 0],
                                    scale: [0.96, 1],
                                    delay: anime.stagger(180),
                                    duration: 900,
                                    easing: 'easeOutBack'
                                });
                            }

                            // 5. Technology Stack Cards
                            if (target.classList.contains('observe-tech-grid')) {
                                anime({
                                    targets: target.querySelectorAll('.tech-stack-card'),
                                    opacity: [0, 1],
                                    translateY: [30, 0],
                                    delay: anime.stagger(100),
                                    duration: 850,
                                    easing: 'easeOutCubic'
                                });
                            }

                            // 6. Interactive Floorplan Preview Zones
                            if (target.classList.contains('observe-interactive-mockup')) {
                                anime({
                                    targets: target.querySelectorAll('.floorplan-zone-card'),
                                    opacity: [0, 1],
                                    translateY: [20, 0],
                                    delay: anime.stagger(120),
                                    duration: 800,
                                    easing: 'easeOutQuart'
                                });
                            }

                            // Stop observing once animated
                            scrollObserver.unobserve(target);
                        }
                    });
                }, { threshold: 0.12 });

                document.querySelectorAll('.observe-section, .observe-product-cards').forEach(el => {
                    scrollObserver.observe(el);
                });
            }
        },

        triggerScanSuccessAnimation: function (containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Flash visual overlay
            const flash = document.createElement('div');
            flash.style.position = 'absolute';
            flash.style.top = '0';
            flash.style.left = '0';
            flash.style.width = '100%';
            flash.style.height = '100%';
            flash.style.backgroundColor = '#D4AF37';
            flash.style.zIndex = '999';
            flash.style.pointerEvents = 'none';
            flash.style.opacity = '0.5';
            container.style.position = 'relative';
            container.appendChild(flash);

            if (typeof anime !== 'undefined') {
                anime({
                    targets: flash,
                    opacity: [0.5, 0],
                    duration: 400,
                    easing: 'easeOutQuad',
                    complete: function () {
                        flash.remove();
                    }
                });
            } else {
                setTimeout(() => flash.remove(), 300);
            }
        }
    };

    // ------------------------------------------------------------------------
    // 4. Progressive Web App Install Helper
    // The mobile companion app is delivered as an installable PWA (the manifest
    // and service worker are already registered). Browsers expose a native
    // install prompt which we capture and replay on demand.
    // ------------------------------------------------------------------------
    window.SiBangkuPwa = {
        deferredPrompt: null,

        isStandalone: function () {
            const displayModeStandalone = typeof window.matchMedia === 'function'
                && window.matchMedia('(display-mode: standalone)').matches;
            return displayModeStandalone || window.navigator.standalone === true;
        },

        init: function () {
            window.addEventListener('beforeinstallprompt', function (event) {
                event.preventDefault();
                window.SiBangkuPwa.deferredPrompt = event;
            });
        },

        /**
         * Triggers the native install prompt when the browser offers one.
         * Returns: 'installed' | 'accepted' | 'dismissed' | 'unavailable'.
         */
        promptInstall: async function () {
            if (window.SiBangkuPwa.isStandalone()) {
                return 'installed';
            }

            const prompt = window.SiBangkuPwa.deferredPrompt;
            if (!prompt) {
                return 'unavailable';
            }

            try {
                prompt.prompt();
                const choice = await prompt.userChoice;
                window.SiBangkuPwa.deferredPrompt = null;
                return (choice && choice.outcome === 'accepted') ? 'accepted' : 'dismissed';
            } catch (error) {
                return 'unavailable';
            }
        }
    };

    window.SiBangkuPwa.init();

    // ------------------------------------------------------------------------
    // 5. User Language Preference Helpers
    // ------------------------------------------------------------------------
    window.SiBangkuLang = {
        getLanguage: function () {
            try {
                return localStorage.getItem('sibangku_lang') || 'id';
            } catch (e) {
                return 'id';
            }
        },
        setLanguage: function (lang) {
            try {
                localStorage.setItem('sibangku_lang', lang);
            } catch (e) { }
        }
    };
})();
