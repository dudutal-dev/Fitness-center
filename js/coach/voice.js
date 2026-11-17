// קול המאמן — מנוע Web Audio:
// • נפתח פעם אחת בנגיעה (חובה באייפון) ואז כל הקליפים מתנגנים בלי חסימות — גם אחרי "שלוש".
// • קליפים נטענים ומפוענחים לזיכרון מראש → אפס השהיה, תזמון מדויק לחזרות.
// • שני סוגי השמעה: רגילה (תור, משפטים ישנים נזרקים) ו"קריטית" (ספירה/טמפו — קוטעת הכל ומתנגנת מיד).
// • גיבוי: HTMLAudio אם אין Web Audio, ו-Web Speech לטקסט דינמי.
import { get } from '../store.js';
import { lineFor, nameLine, FEMALE, NAME_SWAP } from '../data/voice-lines.js';
import { nameEntry } from '../data/names.js';
import { VOICE_TIMING } from '../data/voice-timing.js';

const listeners = new Set();
export const onSpeaking = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (v, text) => listeners.forEach((f) => f(v, text));

export const coachId = () => get().profile?.coach || 'ori';
export const clipUrl = (clip, coach = coachId()) => `assets/voice/${coach}/${clip}.mp3`;
export const clipDur = (clip, coach = coachId()) => VOICE_TIMING[`${coach}/${clip}`] ?? 1;

let ctx = null, gain = null;
const buffers = new Map(); // url -> Promise<AudioBuffer|null>
const htmlCache = new Map();
let queue = [];
let current = null; // { src|audio, entry }
const log = (window.__voiceLog = window.__voiceLog || []);

// ───── פתיחת אודיו (בתוך נגיעה) ─────
export function unlock() {
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback'; // אייפון: להשמיע גם כשהמתג על שקט
  } catch { /* */ }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!ctx) {
    ctx = new AC();
    gain = ctx.createGain();
    gain.connect(ctx.destination);
  }
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  // באפר שקט — "פותח" את האודיו בספארי
  try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch { /* */ }
}
export const audioReady = () => !!ctx && ctx.state === 'running';

function load(clip, coach = coachId()) {
  const url = clipUrl(clip, coach);
  if (!ctx) return Promise.resolve(null);
  if (!buffers.has(url)) {
    buffers.set(url, fetch(url).then((r) => (r.ok ? r.arrayBuffer() : null))
      .then((ab) => (ab ? new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)) : null))
      .catch(() => null));
  }
  return buffers.get(url);
}

// בחירת הקובץ: גרסה עם שם המתאמן (אם הוקלטה), גרסת נקבה למתאמנת, או הרגילה
export function resolve(key, { allowName = true } = {}) {
  const p = get().profile || {};
  const coach = coachId(), sex = p.sex === 'f' ? 'f' : 'm';
  const ne = allowName ? nameEntry(p) : null;
  const sw = NAME_SWAP[key];
  if (ne && sw && Math.random() < sw[1]) return { clip: `names/${ne.slug}/${sw[0]}`, text: nameLine(sw[0], coach, sex, ne.name) };
  const clip = sex === 'f' && FEMALE[key] && (!key.startsWith('hello_') || key === `hello_${coach}`) ? `${key}__f` : key;
  return { clip, text: lineFor(key, coach, sex) };
}

// טעינה מראש של מפתחות (כולל גרסאות שם/נקבה)
export function preload(keys) {
  if (!ctx) return Promise.resolve();
  const ne = nameEntry(get().profile || {});
  const jobs = [];
  for (const k of keys) {
    jobs.push(load(resolve(k, { allowName: false }).clip));
    if (ne && NAME_SWAP[k]) jobs.push(load(`names/${ne.slug}/${NAME_SWAP[k][0]}`));
  }
  return Promise.all(jobs);
}

function toEntry(item) {
  const e = typeof item === 'string' ? { key: item } : { ...item };
  if (e.key && !e.clip) { const r = resolve(e.key); e.clip = r.clip; e.text ??= r.text; }
  e.text = (e.text || '').replace(/\[[^\]]+\]\s*/g, '');
  e.at = performance.now();
  return e;
}

// say('key' | {key} | {text}) — רגיל: נכנס לתור. priority: מנקה את התור.
export function say(item, { priority = false } = {}) {
  const e = toEntry(item);
  if (!get().settings.voice) { emit(false, e.text); return; }
  if (priority) stop();
  queue.push(e);
  if (!current) next();
}

// השמעה קריטית (ספירה/טמפו): קוטעת את מה שמתנגן ומשמיעה מיד את הרצף. מחזיר את משך הרצף בשניות.
export function sayNow(items) {
  const entries = items.filter(Boolean).map((i) => ({ ...toEntry(i), critical: true }));
  if (!get().settings.voice || !entries.length) return 0;
  stopCurrent();
  queue = [...entries, ...queue.filter((q) => !q.critical)];
  next();
  return entries.reduce((t, e) => t + clipDur(e.clip), 0);
}

// משך מפתח (לבדיקה אם קליפ ייכנס בחלון הזמן)
export const keyDur = (key) => clipDur(resolve(key, { allowName: false }).clip);

async function next() {
  let e = queue.shift();
  // משפטים שחיכו יותר מדי כבר לא רלוונטיים
  while (e && performance.now() - e.at > (e.critical ? 1500 : 12000)) e = queue.shift();
  if (!e) { current = null; emit(false); return; }
  current = { entry: e };
  emit(true, e.text);
  const done = () => { if (current?.entry === e) { current = null; next(); } };
  if (!e.clip) return speakTTS(e.text, done);
  if (ctx) {
    const loading = load(e.clip);
    const buf = await (e.critical ? Promise.race([loading, new Promise((r) => setTimeout(() => r(null), 350))]) : loading);
    if (current?.entry !== e) return; // נקטע בזמן הטעינה
    if (buf) {
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      src.buffer = buf;
      gain.gain.value = get().settings.volume ?? 0.9;
      src.connect(gain);
      src.onended = done;
      current.src = src;
      src.start();
      log.push({ clip: e.clip, t: performance.now(), dur: buf.duration, critical: !!e.critical });
      if (log.length > 600) log.splice(0, 300);
      return;
    }
    if (e.critical) return done(); // לא נטען בזמן — מדלגים, לא מעכבים את הספירה
  }
  // גיבוי HTMLAudio (דפדפן בלי Web Audio)
  const url = clipUrl(e.clip);
  let a = htmlCache.get(url);
  if (!a) { a = new Audio(url); htmlCache.set(url, a); }
  a.volume = get().settings.volume ?? 0.9;
  a.currentTime = 0;
  a.onended = done;
  current.audio = a;
  a.play().then(() => log.push({ clip: e.clip, t: performance.now(), dur: a.duration, critical: !!e.critical, html: true }))
    .catch(() => speakTTS(e.text, done));
}

function speakTTS(text, done) {
  try {
    if (!text || !('speechSynthesis' in window)) return done();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL'; u.rate = 1.05; u.volume = get().settings.volume ?? 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith('he'));
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
    setTimeout(done, 5000);
  } catch { done(); }
}

function stopCurrent() {
  if (current?.src) { try { current.src.onended = null; current.src.stop(); } catch { /* */ } }
  if (current?.audio) { current.audio.onended = null; current.audio.pause(); }
  current = null;
}

export function stop() {
  queue = [];
  stopCurrent();
  try { speechSynthesis.cancel(); } catch { /* */ }
  emit(false);
}

export const isSpeaking = () => !!current;
