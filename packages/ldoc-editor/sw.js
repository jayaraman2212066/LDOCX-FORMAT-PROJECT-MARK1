// LDOC Free Editor — Offline iOS Service Worker
// Copyright (c) 2026 J-AI-ENTERPRISES. All Rights Reserved.

const CACHE_NAME = 'ldoc-editor-v2.5.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './ldoc_logo.png',
  './ldoc_background_image.png',
  './jszip.min.js',
  './ldoc-config.js',
  './ldoc-toast.js',
  './ldoc-parser.js',
  './ldoc-editor-core.js',
  './ldoc-shared-modals.js',
  './vendor/three.min.js',
  './vendor/orbit-controls.js',
  './manifest.webmanifest'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('[ServiceWorker] Some assets skipped caching:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, respClone));
        }
        return response;
      }).catch(() => cached);
    })
  );
});
