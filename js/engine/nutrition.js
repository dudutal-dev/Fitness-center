// מנוע תזונה: יעדים קלוריים ומאקרו, ובניית תפריט יומי שמכבד את מה שהמשתמש לא אוכל.
import { FOODS, FOOD } from '../data/foods.js';

// ───── יעדים — כל רכיב מבוסס מקור (ראו docs/NUTRITION_SOURCES.md) ─────
// BMR: משוואת Mifflin-St Jeor (1990).
export function bmr({ weightKg, heightCm, age, sex = 'm' }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'f' ? -161 : 5);
}

// מקדמי פעילות סטנדרטיים (McArdle; בשימוש עם Mifflin-St Jeor): 1.55 בינוני, 1.725 גבוה, 1.9 גבוה מאוד.
// מחקרים על אימונים צבאיים מדדו לעיתים קרובות הוצאה של 4,000+ קק״ל ביום שטח — לכן "שבוע שטח" = 1.9.
export const ACTIVITY = {
  base: { name: 'בסיס', full: 'שגרה בבסיס', factor: 1.55, desc: '3–5 אימונים בשבוע, יום עבודה רגיל' },
  training: { name: 'קבוע', full: 'אימונים קבועים', factor: 1.725, desc: 'אימון כמעט כל יום / יום פעיל' },
  field: { name: 'שטח', full: 'שבוע שטח / אימון קשה', factor: 1.9, desc: 'מסעות, שטח, אימון כפול' },
};

// ירידה במשקל: קצב של ~0.5% ממשקל הגוף בשבוע (Helms et al., 2014), לפי ~7,700 קק״ל לק״ג רקמה (קירוב מקובל).
// מסה: עודף קטן כנקודת התחלה — אין במקורות מספר אחד מוסכם; מתאימים לפי מגמת המשקל אחרי שבועיים.
// כושר קרבי / כוח: איזון אנרגטי (תחזוקה).
export function goalDelta(goal, weightKg) {
  if (goal === 'cut') return -Math.round((0.005 * weightKg * 7700) / 7);
  if (goal === 'muscle') return 250;
  return 0;
}

export function targets(profile) {
  const w = profile.weightKg || 70;
  const act = ACTIVITY[profile.activityLevel] || ACTIVITY.training;
  const tdee = bmr({ weightKg: w, heightCm: profile.heightCm || 175, age: profile.age || 20, sex: profile.sex }) * act.factor;
  const delta = goalDelta(profile.goal, w);
  const kcal = Math.round((tdee + delta) / 10) * 10;
  // חלבון: ISSN (Jäger 2017) — 1.4–2.0 ג׳/ק״ג למתאמנים; בגירעון קלורי יותר (2.3–3.1 ג׳/ק״ג מסת גוף רזה).
  const protein = Math.round(w * (profile.goal === 'cut' ? 2.2 : 2.0));
  // שומן: 25% מהאנרגיה — בתוך הטווח המומלץ 20–35% (Institute of Medicine, AMDR).
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  // שתייה: EFSA — צריכה מספקת 2.5 ל׳ (גברים) / 2.0 ל׳ (נשים) מכל המקורות; כ-70–80% ממשקאות ≈ 2.0 / 1.6 ל׳.
  // + 0.5 ל׳ לכל שעת אימון (ACSM 2007: קצבי הזעה 0.5–2.0 ל׳/שעה — לוקחים את הקצה הנמוך; בחום ובשטח יותר).
  const base = profile.sex === 'f' ? 1.6 : 2.0;
  const waterL = Math.round((base + 0.5 * ((profile.sessionMin || 60) / 60)) * 10) / 10;
  return { kcal, protein, fat, carbs, waterL, tdee: Math.round(tdee), delta, activity: act };
}

export function allowed(food, dislikes = [], dislikedFoods = []) {
  if (dislikedFoods.includes(food.id)) return false;
  return !food.tags.some((t) => dislikes.includes(t));
}

// ארוחות: כל משבצת מתמלאת רק במאכלים שמתאימים לארוחה (שדה meals במאגר) — לא עוף או בשר בבוקר.
const MEALS = [
  { id: 'breakfast', code: 'b', name: 'ארוחת בוקר', icon: '🌅', share: 0.25, slots: [['protein', 'dairy'], ['carb'], ['veg', 'fruit']] },
  { id: 'snack1', code: 's', name: 'ביניים', icon: '⚡', share: 0.1, slots: [['dairy', 'protein'], ['fruit', 'fat']] },
  { id: 'lunch', code: 'l', name: 'צהריים', icon: '🍽️', share: 0.3, slots: [['protein'], ['carb'], ['veg'], ['fat']] },
  { id: 'post', code: 'p', name: 'אחרי אימון', icon: '💪', share: 0.12, slots: [['protein', 'dairy'], ['fruit', 'carb']] },
  { id: 'dinner', code: 'd', name: 'ערב', icon: '🌙', share: 0.23, slots: [['protein', 'dairy'], ['carb'], ['veg']] },
];
// לא נכנסים לתפריט אוטומטי (ההנחיות של משרד הבריאות ממליצות להגביל חטיפים, משקאות ממותקים ובשר מעובד)
const NOT_IN_PLAN = new Set(['bamba', 'bissli', 'chips', 'chocolate', 'wafers', 'cookies', 'ice_cream', 'energy_drink', 'soft_drink', 'iso_drink',
  'chocolate_spread', 'halva', 'hot_dog', 'salami', 'fries', 'mayo', 'butter', 'jam', 'honey', 'popcorn', 'dairy_pudding', 'chocolate_milk']);

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// בניית תפריט יומי. ctx: base | field | home
export function mealPlan(profile, { ctx = 'base', seed = 1 } = {}) {
  const t = targets(profile);
  const rnd = seeded(seed);
  const pool = FOODS.filter((f) => allowed(f, profile.dislikes, profile.dislikedFoods) && f.ctx.includes(ctx) && f.cat !== 'meal' && !NOT_IN_PLAN.has(f.id));
  const usedToday = new Set();
  const meals = MEALS.map((m) => {
    const items = [];
    for (const cats of m.slots) {
      let opts = pool.filter((f) => cats.includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      // לא אוכל ירקות? המשבצת מקבלת פרי או שומן בריא במקום להישאר ריקה
      if (!opts.length && cats.includes('veg')) opts = pool.filter((f) => ['fruit', 'fat'].includes(f.cat) && f.meals.includes(m.code) && !usedToday.has(f.id));
      if (!opts.length) continue;
      const f = opts[Math.floor(rnd() * opts.length)];
      usedToday.add(f.id);
      items.push({ id: f.id, qty: 1 });
    }
    // התאמת כמויות ליעד הארוחה: קודם חלבון, אחר כך פחמימה
    const goalK = t.kcal * m.share, goalP = t.protein * m.share;
    const sum = () => items.reduce((a, it) => { const f = FOOD[it.id]; a.k += f.kcal * it.qty; a.p += f.p * it.qty; return a; }, { k: 0, p: 0 });
    const prot = items.find((it) => ['protein', 'dairy'].includes(FOOD[it.id].cat));
    if (prot) {
      const f = FOOD[prot.id];
      prot.qty = clampQ((goalP - (sum().p - f.p * prot.qty)) / f.p, f.cat);
    }
    const carb = items.find((it) => ['carb', 'fruit', 'snack'].includes(FOOD[it.id].cat));
    if (carb) {
      const f = FOOD[carb.id];
      carb.qty = clampQ((goalK - (sum().k - f.kcal * carb.qty)) / f.kcal, f.cat);
    }
    const tot = items.reduce((a, it) => { const f = FOOD[it.id]; a.kcal += f.kcal * it.qty; a.p += f.p * it.qty; a.c += f.c * it.qty; a.f += f.f * it.qty; return a; }, { kcal: 0, p: 0, c: 0, f: 0 });
    return { ...m, items, total: roundMacros(tot) };
  });
  const total = roundMacros(meals.reduce((a, m) => ({ kcal: a.kcal + m.total.kcal, p: a.p + m.total.p, c: a.c + m.total.c, f: a.f + m.total.f }), { kcal: 0, p: 0, c: 0, f: 0 }));
  const noVeg = (profile.dislikes || []).includes('vegetables');
  return { targets: t, meals, total, noVeg };
}

// תקרות כמות ריאליות לפי סוג (למשל לא 9 כפות סלט ביצים): חלבון/חלב עד ×2, פחמימה עד ×2.5, פרי/חטיף עד ×1.5
const QCAP = { protein: 2, dairy: 2, carb: 2, fruit: 1.5, snack: 1.5, fat: 1.5, veg: 2 };
const clampQ = (q, cat) => Math.min(QCAP[cat] || 2, Math.max(0.5, Math.round(q * 2) / 2));
const roundMacros = (o) => ({ kcal: Math.round(o.kcal), p: Math.round(o.p), c: Math.round(o.c), f: Math.round(o.f) });

export function qtyLabel(q) {
  if (q === 1) return '';
  if (q === 0.5) return 'חצי מנה · ';
  if (q === 1.5) return 'מנה וחצי · ';
  if (q === 2) return 'מנה כפולה · ';
  return `×${q} · `;
}

// ───── יומן אכילה ─────
// daily.foods: [{ id, qty, at }] ; מזונות אישיים: profile.customFoods
export function foodLookup(id, customFoods = []) {
  return FOOD[id] || customFoods.find((f) => f.id === id) || null;
}

export function dayTotals(dd = {}, customFoods = []) {
  const t = { kcal: 0, p: 0, c: 0, f: 0 };
  for (const it of dd.foods || []) {
    const f = foodLookup(it.id, customFoods);
    if (!f) continue;
    t.kcal += f.kcal * it.qty; t.p += f.p * it.qty; t.c += f.c * it.qty; t.f += f.f * it.qty;
  }
  t.p += dd.protein || 0; // תוספות חלבון מהירות (+20 ג׳)
  t.kcal += (dd.protein || 0) * 4;
  return roundMacros(t);
}

const norm = (s) => String(s).replace(/[׳״'"\-–—()]/g, '').replace(/\s+/g, ' ').trim();

// חיפוש: התאמה לפי מילים (כל מילה בחיפוש צריכה להופיע בשם), מזון אישי קודם
export function searchFoods(query, customFoods = [], { cat = null, limit = 40 } = {}) {
  const words = norm(query).split(' ').filter(Boolean);
  const pool = [...customFoods, ...FOODS];
  const res = pool.filter((f) => (!cat || f.cat === cat || (cat === 'custom' && f.custom)) && words.every((w) => norm(f.name).includes(w)));
  if (words.length) res.sort((a, b) => (norm(a.name).startsWith(words[0]) ? 0 : 1) - (norm(b.name).startsWith(words[0]) ? 0 : 1));
  return res.slice(0, limit);
}
