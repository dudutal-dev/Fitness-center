// Service Worker: קוד האפליקציה נשמר במטמון לפי גרסה (עובד אופליין), מדיה במטמון נפרד שמתרענן רק כשהמדיה משתנה.
// הגרסאות מתעדכנות אוטומטית ע״י tools/release.mjs — כל שינוי כאן גורם לדפדפן להתקין את הגרסה החדשה.
const VERSION = 'lohem-20261117.225206';
const MEDIA = 'lohem-media-20261117.223027';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'css/app.css', 'version.json',
  'js/app.js', 'js/version.js', 'js/updater.js', 'js/theme.js', 'js/reminders.js', 'js/views/reminders-ui.js', 'js/store.js', 'js/ui/dom.js', 'js/ui/charts.js', 'js/coach/voice.js',
  'js/data/exercises.js', 'js/data/foods.js', 'js/data/coaches.js', 'js/data/voice-lines.js', 'js/data/names.js', 'js/data/demo-timing.js', 'js/data/voice-timing.js',
  'js/engine/program.js', 'js/engine/progression.js', 'js/engine/running.js', 'js/engine/nutrition.js', 'js/engine/stats.js', 'js/engine/history-edit.js',
  'js/views/onboarding.js', 'js/views/home.js', 'js/views/plan.js', 'js/views/workout.js', 'js/views/run.js',
  'js/views/progress.js', 'js/views/nutrition.js', 'js/views/coach.js', 'js/views/garmin.js', 'js/views/guide.js', 'js/views/history.js',
  'js/devices/fit.js', 'js/devices/importer.js', 'js/devices/hr.js', 'js/devices/gps.js', 'js/devices/ui.js',
  'assets/coaches/ori.webp', 'assets/coaches/noa.webp', 'assets/coaches/ori_face.webp', 'assets/coaches/noa_face.webp',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' — עוקף את מטמון ה-HTTP כדי שהגרסה החדשה תיטען במלואה
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== MEDIA).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (req.headers.has('range')) return; // וידאו: בקשות טווח הולכות ישר לרשת
  if (url.pathname.endsWith('/version.json')) { e.respondWith(fetch(req, { cache: 'no-store' }).catch(() => caches.match(req))); return; }
  const isMedia = /\/assets\/(demos|voice)\//.test(url.pathname) || url.origin !== location.origin;
  if (isMedia) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.status === 200) { const copy = res.clone(); caches.open(MEDIA).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  // קוד: רשת קודם (עם אימות מול השרת), ואם אין קליטה — מהמטמון
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('index.html'))));
});

// ───── תזכורות Push ─────
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'LOHEM', body: e.data?.text() || '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'LOHEM', {
    body: d.body || '', tag: d.tag || 'lohem', renotify: true, lang: 'he', dir: 'rtl',
    icon: 'assets/icons/icon-192.png', badge: 'assets/icons/icon-192.png', data: { url: d.url || './#/home' },
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './#/home', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const w = list.find((c) => c.url.startsWith(self.registration.scope));
    if (w) { w.navigate?.(url); return w.focus(); }
    return self.clients.openWindow(url);
  }));
});
