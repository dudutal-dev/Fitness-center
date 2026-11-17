// קול המאמן: השמעת קבצי MP3 שנוצרו ב-ElevenLabs, תור השמעה, וגיבוי Web Speech (he-IL) לטקסט דינמי.
import { get } from '../store.js';
import { lineFor, nameLine, FEMALE, NAME_SWAP } from '../data/voice-lines.js';
import { nameEntry } from '../data/names.js';

const cache = new Map();
let queue = [];
let playing = null;
let unlocked = false;
const listeners = new Set();

export const onSpeaking = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (v, text) => listeners.forEach((f) => f(v, text));

export const coachId = () => get().profile?.coach || 'ori';
export const clipUrl = (key, coach = coachId()) => `assets/voice/${coach}/${key}.mp3`;

function audioFor(key, coach) {
  const url = clipUrl(key, coach);
  if (!cache.has(url)) {
    const a = new Audio(url);
    a.preload = 'auto';
    cache.set(url, a);
  }
  return cache.get(url);
}

// iOS/Safari: חייבים "לפתוח" אודיו בתוך מחווה של המשתמש
export function unlock() {
  if (unlocked) return;
  unlocked = true;
  // משמיעים קליפ קצר בעוצמה 0 כדי לאפשר השמעה אוטומטית בהמשך
  const a = audioFor('n1', coachId());
  a.volume = 0;
  a.play().then(() => { a.pause(); a.currentTime = 0; }).catch(() => {});
  try { speechSynthesis.speak(new SpeechSynthesisUtterance('')); } catch { /* */ }
}

export function preload(keys, coach = coachId()) {
  keys.forEach((k) => audioFor(resolve(k, { allowName: false }).clip, coach));
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

// say('key') או say({text}) — מצטרף לתור. priority: מנקה תור קודם
export function say(item, { priority = false } = {}) {
  const s = get().settings;
  const entry = typeof item === 'string' ? { key: item } : item;
  if (entry.key && !entry.clip) { const r = resolve(entry.key); entry.clip = r.clip; entry.text ??= r.text; }
  entry.text = (entry.text || '').replace(/\[[^\]]+\]\s*/g, '');
  if (!s.voice) { emit(false, entry.text); return; }
  if (priority) { stop(); }
  queue.push(entry);
  if (!playing) next();
}

function next() {
  const entry = queue.shift();
  if (!entry) { playing = null; emit(false); return; }
  playing = entry;
  emit(true, entry.text);
  const done = () => { if (playing === entry) { playing = null; next(); } };
  if (entry.clip) {
    const a = audioFor(entry.clip, coachId());
    a.volume = get().settings.volume ?? 0.9;
    a.currentTime = 0;
    a.onended = done;
    a.onerror = () => speakTTS(entry.text, done);
    a.play().catch(() => speakTTS(entry.text, done));
  } else {
    speakTTS(entry.text, done);
  }
}

// גיבוי: סינתזת דיבור של הדפדפן בעברית
function speakTTS(text, done) {
  try {
    if (!text || !('speechSynthesis' in window)) return done();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'he-IL';
    u.rate = 1.05;
    u.volume = get().settings.volume ?? 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang?.startsWith('he'));
    if (v) u.voice = v;
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
    setTimeout(done, 6000);
  } catch { done(); }
}

export function stop() {
  queue = [];
  if (playing?.clip) { const a = audioFor(playing.clip, coachId()); a.pause(); a.onended = null; }
  try { speechSynthesis.cancel(); } catch { /* */ }
  playing = null;
  emit(false);
}

export const isSpeaking = () => !!playing;
