// SiBangku High-Efficiency Service Worker
// Designed for low-memory & low-spec device optimization with real-time sync

const CACHE_NAME = 'sibangku-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/app.css',
    '/favicon.png',
    '/brand/App-Icon_PWA-Icon.svg',
    '/brand/Navbar-Header-Logo.svg',
    '/brand/Navbar-Header-Logo-Light.svg',
    '/lib/bootstrap/dist/css/bootstrap.min.css',
    '/lib/animejs/anime.min.js',
    '/lib/html5-qrcode/html5-qrcode.min.js',
    '/js/sibangku-app.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    // For Blazor SignalR / WebSocket or API calls, always go to network
    const url = new URL(event.request.url);
    if (
        event.request.method !== 'GET' ||
        url.pathname.includes('_blazor') ||
        url.pathname.includes('/api/') ||
        url.pathname.includes('/_framework/')
    ) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch in background to keep cache fresh (stale-while-revalidate)
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                return caches.match('/');
            });
        })
    );
});
