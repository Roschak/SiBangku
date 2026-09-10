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

        // 4. If plain alphanumeric code (e.g. DISTRO-AVENUE, PADANG-MERDEKA)
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
                    console.warn('Html5Qrcode library not loaded yet');
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
                console.warn('Error fetching camera devices:', err);
                return [];
            }
        },

        startScanner: async function (containerId, dotNetHelper, callbackMethod, preferredCameraId) {
            currentScanningDotNetHelper = dotNetHelper;
            currentCallbackMethodName = callbackMethod || 'OnQrCodeScanned';

            const container = document.getElementById(containerId);
            if (!container) {
                console.error(`QR Scanner container #${containerId} not found`);
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
                        console.info('Rear camera unavailable, falling back to default/webcam camera');
                        await html5QrScannerInstance.start({ facingMode: "user" }, qrConfig, onScanSuccess, onScanFailure);
                    }
                }

                return { success: true };
            } catch (err) {
                console.error('Failed to start camera scanner:', err);
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
                    console.warn('Error stopping scanner:', e);
                } finally {
                    html5QrScannerInstance = null;
                }
            }
        }
    };

    // ------------------------------------------------------------------------
    // 3. High-End Animated Scroll & Interactive Experience Engine
    // ------------------------------------------------------------------------
    window.SiBangkuScroll = {
        init: function () {
            const progressBar = document.getElementById('sibangku-scroll-progress');
            const backToTopBtn = document.getElementById('sibangku-back-to-top');
            const circle = backToTopBtn ? backToTopBtn.querySelector('.progress-ring-circle') : null;
            const ambient1 = document.querySelector('.ambient-float-1');
            const ambient2 = document.querySelector('.ambient-float-2');
            const circumference = 138; // 2 * PI * 22

            let ticking = false;

            function onScrollUpdate() {
                const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
                const docHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
                const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

                // 1. Update Top Gold Progress Bar
                if (progressBar) {
                    progressBar.style.width = `${Math.min(100, Math.max(0, scrollPercent))}%`;
                }

                // 2. Update Back-to-Top Button & Circular Indicator
                if (backToTopBtn) {
                    if (scrollTop > 260) {
                        backToTopBtn.classList.add('show');
                    } else {
                        backToTopBtn.classList.remove('show');
                    }

                    if (circle) {
                        const offset = circumference - (scrollPercent / 100) * circumference;
                        circle.style.strokeDashoffset = offset;
                    }
                }

                // 3. Subtle Parallax for Ambient Light Blooms
                if (ambient1 && ambient2) {
                    ambient1.style.transform = `translateY(${scrollTop * 0.08}px)`;
                    ambient2.style.transform = `translateY(-${scrollTop * 0.06}px)`;
                }

                // 4. Update Quick-Jump Scrollspy Dots
                const sections = [
                    { id: 'hero', dot: document.querySelector('.ms-quick-jump-dot[data-target="#hero"]') },
                    { id: 'simulasi', dot: document.querySelector('.ms-quick-jump-dot[data-target="#simulasi"]') },
                    { id: 'keunggulan', dot: document.querySelector('.ms-quick-jump-dot[data-target="#keunggulan"]') },
                    { id: 'alur', dot: document.querySelector('.ms-quick-jump-dot[data-target="#alur"]') },
                    { id: 'teknologi', dot: document.querySelector('.ms-quick-jump-dot[data-target="#teknologi"]') },
                    { id: 'cta', dot: document.querySelector('.ms-quick-jump-dot[data-target="#cta"]') }
                ];

                const scrollMiddle = scrollTop + window.innerHeight * 0.35;
                for (let i = sections.length - 1; i >= 0; i--) {
                    const el = document.getElementById(sections[i].id);
                    if (el && el.offsetTop <= scrollMiddle) {
                        document.querySelectorAll('.ms-quick-jump-dot').forEach(d => d.classList.remove('active'));
                        if (sections[i].dot) sections[i].dot.classList.add('active');
                        break;
                    }
                }

                ticking = false;
            }

            window.addEventListener('scroll', function () {
                if (!ticking) {
                    window.requestAnimationFrame(onScrollUpdate);
                    ticking = true;
                }
            }, { passive: true });

            // Initial call
            onScrollUpdate();

            // Smooth Anchor Scrolling for all # links
            document.querySelectorAll('a[href^="#"]').forEach(anchor => {
                anchor.addEventListener('click', function (e) {
                    const targetId = this.getAttribute('href');
                    if (targetId && targetId !== '#') {
                        const targetEl = document.querySelector(targetId);
                        if (targetEl) {
                            e.preventDefault();
                            const topOffset = 70; // Header height
                            const elementPosition = targetEl.getBoundingClientRect().top;
                            const offsetPosition = elementPosition + window.pageYOffset - topOffset;

                            window.scrollTo({
                                top: offsetPosition,
                                behavior: 'smooth'
                            });
                        }
                    }
                });
            });
        },

        scrollToTop: function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        },

        scrollToElement: function (elementId) {
            const el = document.getElementById(elementId);
            if (el) {
                const topOffset = 70;
                const elementPosition = el.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - topOffset;
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        }
    };

    window.SiBangkuAnime = {
        initLandingAnimations: function () {
            // Initialize global scroll listener & indicators
            if (window.SiBangkuScroll && typeof window.SiBangkuScroll.init === 'function') {
                window.SiBangkuScroll.init();
            }

            if (typeof anime === 'undefined') {
                console.warn('Anime.js library is not loaded');
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
            anime({
                targets: '.ambient-float-1',
                translateY: [-14, 14],
                translateX: [-10, 10],
                duration: 6000,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });

            anime({
                targets: '.ambient-float-2',
                translateY: [16, -16],
                translateX: [12, -12],
                duration: 7000,
                direction: 'alternate',
                loop: true,
                easing: 'easeInOutSine'
            });

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
                            if (target.classList.contains('observe-product-cards')) {
                                anime({
                                    targets: target.querySelectorAll('.product-feature-card'),
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

                document.querySelectorAll('.observe-section').forEach(el => {
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
    // 4. User Language Preference Helpers
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
