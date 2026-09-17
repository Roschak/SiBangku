/**
 * SiBangku - Three.js Ambient Scene
 * ---------------------------------------------------------------------------
 * A single, lightweight WebGL scene used as the landing page's ambient
 * background: a slow "dining constellation" of champagne-gold particles with
 * three orbital rings.
 *
 * Design constraints (deliberately conservative):
 *  - Never blocks the page: the module is imported on demand from the landing
 *    page only, through Blazor's dynamic `import` interop.
 *  - Respects `prefers-reduced-motion`: no scene is created at all.
 *  - Pauses rendering while the tab is hidden and when the canvas scrolls out
 *    of view.
 *  - Releases every GPU resource on dispose.
 *  - Degrades silently when WebGL is unavailable.
 */

import * as THREE from '../lib/three/three.module.js';

const PARTICLE_COUNT = 280;
const ACCENT = 0xb88e2d;
const ACCENT_BRIGHT = 0xd4af37;

let state = null;

function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function createParticleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 246, 224, 1)');
    gradient.addColorStop(0.35, 'rgba(212, 175, 55, 0.85)');
    gradient.addColorStop(1, 'rgba(184, 142, 45, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
}

function buildScene(width, height) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, width / height, 0.1, 100);
    camera.position.set(0, 0, 7);

    const group = new THREE.Group();
    scene.add(group);

    // --- Particle constellation -------------------------------------------------
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const index = i * 3;
        // A flattened disc of points reads as "a room seen at an angle".
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.8 + Math.random() * 4.2;
        positions[index] = Math.cos(angle) * radius;
        positions[index + 1] = (Math.random() - 0.5) * 3.2;
        positions[index + 2] = Math.sin(angle) * radius * 0.55;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleTexture = createParticleTexture();
    const particleMaterial = new THREE.PointsMaterial({
        size: 0.16,
        map: particleTexture || null,
        color: ACCENT_BRIGHT,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    group.add(particles);

    // --- Orbital rings ---------------------------------------------------------
    const ringGeometries = [];
    const ringMaterials = [];
    const ringLayout = [
        { radius: 2.1, tilt: 0.28, opacity: 0.34 },
        { radius: 3.0, tilt: -0.5, opacity: 0.22 },
        { radius: 3.9, tilt: 0.72, opacity: 0.14 }
    ];

    ringLayout.forEach((ring, index) => {
        const geometry = new THREE.TorusGeometry(ring.radius, 0.006, 6, 128);
        const material = new THREE.MeshBasicMaterial({
            color: index === 1 ? ACCENT : ACCENT_BRIGHT,
            transparent: true,
            opacity: ring.opacity,
            depthWrite: false
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2 + ring.tilt;
        mesh.rotation.y = ring.tilt * 0.6;
        group.add(mesh);

        ringGeometries.push(geometry);
        ringMaterials.push(material);
    });

    return {
        scene,
        camera,
        group,
        particles,
        particleGeometry,
        particleMaterial,
        particleTexture,
        ringGeometries,
        ringMaterials
    };
}

/**
 * Initialises the ambient hero scene on the given canvas element.
 * Silently does nothing when motion is reduced or WebGL is unavailable.
 */
export function initHeroScene(canvasId) {
    disposeHeroScene();

    if (prefersReducedMotion()) {
        return;
    }

    const canvas = document.getElementById(canvasId);
    if (!canvas) {
        return;
    }

    // The canvas is hidden on small screens / reduced-motion via CSS; skip the
    // whole scene in that case so low-end devices pay nothing.
    const initialRect = canvas.getBoundingClientRect();
    if (initialRect.width < 2 || initialRect.height < 2) {
        return;
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: window.devicePixelRatio <= 1.5,
            powerPreference: 'low-power'
        });
    } catch (error) {
        // WebGL unsupported / blocked: the CSS gradient fallback stays visible.
        return;
    }

    const width = Math.max(1, Math.floor(initialRect.width));
    const height = Math.max(1, Math.floor(initialRect.height));

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(width, height, false);

    const world = buildScene(width, height);

    const pointer = { x: 0, y: 0 };
    const target = { x: 0, y: 0 };
    let frameId = 0;
    let running = true;
    let elapsed = 0;
    let lastTime = performance.now();

    function render(time) {
        if (!running) return;

        const delta = Math.min((time - lastTime) / 1000, 0.05);
        lastTime = time;
        elapsed += delta;

        // Ease the pointer influence so movement never feels twitchy.
        target.x += (pointer.x - target.x) * 0.045;
        target.y += (pointer.y - target.y) * 0.045;

        world.group.rotation.y = elapsed * 0.045 + target.x * 0.35;
        world.group.rotation.x = Math.sin(elapsed * 0.22) * 0.05 + target.y * 0.22;
        world.group.position.y = Math.sin(elapsed * 0.35) * 0.12;

        renderer.render(world.scene, world.camera);
        frameId = window.requestAnimationFrame(render);
    }

    function start() {
        if (running && !frameId) {
            lastTime = performance.now();
            frameId = window.requestAnimationFrame(render);
        }
    }

    function pause() {
        if (frameId) {
            window.cancelAnimationFrame(frameId);
            frameId = 0;
        }
    }

    function onPointerMove(event) {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -((event.clientY / window.innerHeight) * 2 - 1);
    }

    function onVisibilityChange() {
        running = !document.hidden;
        if (running) {
            start();
        } else {
            pause();
        }
    }

    function onResize() {
        const nextRect = canvas.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.floor(nextRect.width));
        const nextHeight = Math.max(1, Math.floor(nextRect.height));

        world.camera.aspect = nextWidth / nextHeight;
        world.camera.updateProjectionMatrix();
        renderer.setSize(nextWidth, nextHeight, false);
    }

    // Only animate while the canvas is actually on screen.
    let observer = null;
    if (typeof IntersectionObserver === 'function') {
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                running = !document.hidden && entry.isIntersecting;
                if (running) {
                    start();
                } else {
                    pause();
                }
            });
        }, { threshold: 0.01 });
        observer.observe(canvas);
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    state = {
        canvas,
        renderer,
        world,
        observer,
        onPointerMove,
        onResize,
        onVisibilityChange,
        dispose() {
            running = false;
            window.cancelAnimationFrame(frameId);
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('resize', onResize);
            document.removeEventListener('visibilitychange', onVisibilityChange);
            if (observer) observer.disconnect();

            world.particleGeometry.dispose();
            world.particleMaterial.dispose();
            if (world.particleTexture) world.particleTexture.dispose();
            world.ringGeometries.forEach((geometry) => geometry.dispose());
            world.ringMaterials.forEach((material) => material.dispose());

            renderer.dispose();
        }
    };

    start();
}

/** Tears the ambient scene down and releases all GPU resources. */
export function disposeHeroScene() {
    if (!state) return;
    try {
        state.dispose();
    } catch (error) {
        // Disposal must never surface an error to the page.
    }
    state = null;
}
