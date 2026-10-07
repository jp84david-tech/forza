// Offline support: cache every game file on first visit, then serve from cache.
const CACHE = 'kaze-no-shima-v7';
const FILES = [
  './',
  './kaze-no-shima.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon.svg',
  './models/Soldier.glb',
  './models/Stork.glb',
  './vendor/three/build/three.module.js',
  './vendor/three/examples/jsm/loaders/GLTFLoader.js',
  './vendor/three/examples/jsm/objects/Sky.js',
  './vendor/three/examples/jsm/objects/Water.js',
  './vendor/three/examples/jsm/postprocessing/EffectComposer.js',
  './vendor/three/examples/jsm/postprocessing/MaskPass.js',
  './vendor/three/examples/jsm/postprocessing/OutputPass.js',
  './vendor/three/examples/jsm/postprocessing/Pass.js',
  './vendor/three/examples/jsm/postprocessing/RenderPass.js',
  './vendor/three/examples/jsm/postprocessing/ShaderPass.js',
  './vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js',
  './vendor/three/examples/jsm/shaders/CopyShader.js',
  './vendor/three/examples/jsm/shaders/LuminosityHighPassShader.js',
  './vendor/three/examples/jsm/shaders/OutputShader.js',
  './vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
  './vendor/three/examples/jsm/utils/SkeletonUtils.js',
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first so updates arrive when online; fall back to the cache when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
