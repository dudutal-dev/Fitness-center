// Service Worker: קוד האפליקציה במטמון מראש (עובד אופליין), מדיה נשמרת במטמון בשימוש הראשון.
const VERSION = 'lohem-v1';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/ui/dom.js', 'js/ui/charts.js', 'js/coach/voice.js',
  'js/data/exercises.js', 'js/data/foods.js', 'js/data/coaches.js', 'js/data/voice-lines.js',
  'js/engine/program.js', 'js/engine/progression.js', 'js/engine/running.js', 'js/engine/nutrition.js', 'js/engine/stats.js',
  'js/views/onboarding.js', 'js/views/home.js', 'js/views/plan.js', 'js/views/workout.js', 'js/views/run.js',
  'js/views/progress.js', 'js/views/nutrition.js', 'js/views/coach.js',
  'assets/coaches/ori.webp', 'assets/coaches/noa.webp', 'assets/coaches/ori_face.webp', 'assets/coaches/noa_face.webp',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // וידאו: לא שומרים תגובות Range חלקיות
  if (req.headers.has('range')) return;
  const isMedia = /\/assets\/(demos|voice)\//.test(url.pathname);
  if (isMedia || url.origin !== location.origin) {
    // cache-first למדיה ולפונטים
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // קוד: network-first עם נפילה למטמון (עדכונים מגיעים מיד, ואופליין עדיין עובד)
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))));
});
