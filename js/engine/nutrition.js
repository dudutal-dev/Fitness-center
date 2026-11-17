// מנוע תזונה: יעדים קלוריים ומאקרו, ובניית תפריט יומי שמכבד את מה שהמשתמש לא אוכל.
import { FOODS, FOOD } from '../data/foods.js';

export function bmr({ weightKg, heightCm, age, sex = 'm' }) {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'f' ? -161 : 5);
}

const GOAL_DELTA = { cut: -450, muscle: 300, strength: 200, combat: 150 };

export function targets(profile) {
  const w = profile.weightKg || 70;
  const activity = profile.activity ?? 1.75; // חייל קרבי + אימונים
  const tdee = bmr({ weightKg: w, heightCm: profile.heightCm || 175, age: profile.age || 20, sex: profile.sex }) * activity;
  const kcal = Math.round((tdee + (GOAL_DELTA[profile.goal] ?? 0)) / 10) * 10;
  const protein = Math.round(w * (profile.goal === 'cut' ? 2.2 : 2.0));
  const fat = Math.round((kcal * 0.25) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const waterL = Math.round((w * 0.035 + 1.0) * 10) / 10; // +1 ליטר לפעילות צבאית
  return { kcal, protein, fat, carbs, waterL, tdee: Math.round(tdee) };
}

export function allowed(food, dislikes = [], dislikedFoods = []) {
  if (dislikedFoods.includes(food.id)) return false;
  return !food.tags.some((t) => dislikes.includes(t));
}

const MEALS = [
  { id: 'breakfast', name: 'ארוחת בוקר', icon: '🌅', share: 0.25, slots: [['protein', 'dairy'], ['carb'], ['fruit', 'fat']] },
  { id: 'snack1', name: 'ביניים', icon: '⚡', share: 0.1, slots: [['dairy', 'snack', 'protein'], ['fruit', 'snack']] },
  { id: 'lunch', name: 'צהריים', icon: '🍽️', share: 0.3, slots: [['protein'], ['carb'], ['fat'], ['veg']] },
  { id: 'post', name: 'אחרי אימון', icon: '💪', share: 0.12, slots: [['protein'], ['fruit', 'carb']] },
  { id: 'dinner', name: 'ערב', icon: '🌙', share: 0.23, slots: [['protein', 'dairy'], ['carb'], ['fat', 'veg']] },
];

function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

// בניית תפריט יומי. ctx: base | field | home
export function mealPlan(profile, { ctx = 'base', seed = 1 } = {}) {
  const t = targets(profile);
  const rnd = seeded(seed);
  const pool = FOODS.filter((f) => allowed(f, profile.dislikes, profile.dislikedFoods) && f.ctx.includes(ctx));
  const usedToday = new Set();
  const meals = MEALS.map((m) => {
    const items = [];
    for (const cats of m.slots) {
      const opts = pool.filter((f) => cats.includes(f.cat) && !usedToday.has(f.id));
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
      prot.qty = clampQ((goalP - (sum().p - f.p * prot.qty)) / f.p);
    }
    const carb = items.find((it) => ['carb', 'fruit', 'snack'].includes(FOOD[it.id].cat));
    if (carb) {
      const f = FOOD[carb.id];
      carb.qty = clampQ((goalK - (sum().k - f.kcal * carb.qty)) / f.kcal);
    }
    const tot = items.reduce((a, it) => { const f = FOOD[it.id]; a.kcal += f.kcal * it.qty; a.p += f.p * it.qty; a.c += f.c * it.qty; a.f += f.f * it.qty; return a; }, { kcal: 0, p: 0, c: 0, f: 0 });
    return { ...m, items, total: roundMacros(tot) };
  });
  const total = roundMacros(meals.reduce((a, m) => ({ kcal: a.kcal + m.total.kcal, p: a.p + m.total.p, c: a.c + m.total.c, f: a.f + m.total.f }), { kcal: 0, p: 0, c: 0, f: 0 }));
  const noVeg = (profile.dislikes || []).includes('vegetables');
  return { targets: t, meals, total, noVeg };
}

const clampQ = (q) => Math.min(3, Math.max(0.5, Math.round(q * 2) / 2));
const roundMacros = (o) => ({ kcal: Math.round(o.kcal), p: Math.round(o.p), c: Math.round(o.c), f: Math.round(o.f) });

export function qtyLabel(q) {
  if (q === 1) return '';
  if (q === 0.5) return 'חצי מנה · ';
  if (q === 1.5) return 'מנה וחצי · ';
  if (q === 2) return 'מנה כפולה · ';
  return `×${q} · `;
}
