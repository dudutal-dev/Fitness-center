// מסך תזונה: יעדים, תפריט יומי לפי הקשר (בסיס/שטח/בית), "לא אוכל", מעקב שתייה וחלבון, טיפים.
import { html, esc, on, toast } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily } from '../store.js';
import { mealPlan, qtyLabel } from '../engine/nutrition.js';
import { FOOD, FOODS, DISLIKE_TAGS, NO_VEG_TIPS, ARMY_TIPS } from '../data/foods.js';

let ctx = 'base';
let seed = new Date().getDate();
let editDislikes = false;

export function renderNutrition(root) {
  const s = get();
  const p = s.profile;
  const plan = mealPlan(p, { ctx, seed });
  const t = plan.targets;
  const dd = daily();
  const ctxs = [['base', '🪖 בבסיס'], ['field', '🎒 בשטח'], ['home', '🏠 בבית']];

  root.innerHTML = html`<div class="eyebrow">תזונת לוחם</div><div class="h1">דלק לביצועים</div>
    <div class="card hud" style="margin-top:14px">
      <div class="row between"><div><div class="sub" style="font-size:12px">יעד יומי</div><div class="num" style="font-size:34px;font-weight:800">${t.kcal.toLocaleString('he-IL')} <span class="sub" style="font-size:14px">קלוריות</span></div></div>
        <span class="tag ${p.goal === 'cut' ? 'orange' : 'lime'}">${p.goal === 'cut' ? 'גירעון' : p.goal === 'muscle' ? 'עודף' : 'תחזוקה+'}</span></div>
      <div class="macro-rings" style="margin-top:14px">
        ${ring(Math.min(1, dd.protein / t.protein), { size: 72, stroke: 7, big: t.protein, lbl: 'חלבון ג׳' })}
        ${ring(1, { size: 72, stroke: 7, big: t.carbs, lbl: 'פחמ׳ ג׳', color: '#22e6d0' })}
        ${ring(1, { size: 72, stroke: 7, big: t.fat, lbl: 'שומן ג׳', color: '#ff8a3d' })}
        ${ring(Math.min(1, dd.water / (t.waterL * 1000)), { size: 72, stroke: 7, big: t.waterL, lbl: 'מים ל׳', color: '#5aa9ff' })}
      </div>
      <div class="grid2" style="margin-top:14px">
        <button class="btn sm" data-add="water">💧 +250 מ״ל <span class="num sub">(${(dd.water / 1000).toFixed(2)})</span></button>
        <button class="btn sm" data-add="protein">🥩 +20 ג׳ <span class="num sub">(${dd.protein})</span></button>
      </div>
    </div>

    <div class="h2">🍽️ התפריט של היום<span class="more" data-act="shuffle">🎲 תפריט אחר</span></div>
    <div class="seg" style="margin-bottom:12px">${ctxs.map(([k, v]) => `<button data-ctx="${k}" class="${ctx === k ? 'on' : ''}">${v}</button>`)}</div>
    ${plan.meals.map((m) => html`<div class="card tight meal">
      <div class="row between" style="margin-bottom:6px"><b>${m.icon} ${m.name}</b><span class="num sub" style="font-size:13px">${m.total.kcal} קק״ל · ${m.total.p}ג׳ חלבון</span></div>
      ${m.items.map((it) => { const f = FOOD[it.id]; return `<div class="mi"><span>${esc(f.name)}</span><small>${qtyLabel(it.qty)}${esc(f.portion)}</small></div>`; })}
    </div>`)}
    <div class="sub" style="margin-top:8px;text-align:center">סה״כ: <span class="num">${plan.total.kcal}</span> קק״ל · <span class="num">${plan.total.p}</span>ג׳ חלבון · <span class="num">${plan.total.c}</span>ג׳ פחמימה · <span class="num">${plan.total.f}</span>ג׳ שומן</div>

    <div class="h2">🚫 מה אני לא אוכל<span class="more" data-act="edit">${editDislikes ? 'סיום ✓' : 'עריכה'}</span></div>
    <div class="card tight">
      ${editDislikes ? html`<div class="sub" style="margin-bottom:8px">קטגוריות:</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([k, v]) => `<button class="chip no ${p.dislikes.includes(k) ? 'on' : ''}" data-dis="${k}">${v}</button>`)}</div>
        <div class="sub" style="margin:14px 0 8px">מאכלים ספציפיים:</div>
        <div class="chips">${FOODS.map((f) => `<button class="chip no ${(p.dislikedFoods || []).includes(f.id) ? 'on' : ''}" data-food="${f.id}">${esc(f.name)}</button>`)}</div>`
      : html`<div class="chips">${[...p.dislikes.map((k) => DISLIKE_TAGS[k]), ...(p.dislikedFoods || []).map((id) => FOOD[id]?.name)].filter(Boolean).map((x) => `<span class="chip no on">${esc(x)}</span>`).join('') || '<span class="sub">אוכל הכל 👌</span>'}</div>`}
    </div>

    ${plan.noVeg ? html`<div class="h2">🥦 בלי ירקות — ככה משלימים</div><div class="card tight">${NO_VEG_TIPS.map(tip)}</div>` : ''}
    <div class="h2">🪖 טיפים לחייל</div><div class="card tight">${ARMY_TIPS.map(tip)}</div>
    <p class="sub" style="font-size:12px;margin-top:12px">ההמלצות כלליות ואינן תחליף לייעוץ של דיאטנית/רופא. חישוב: Mifflin-St Jeor × פעילות קרבית, חלבון ${p.goal === 'cut' ? '2.2' : '2.0'} ג׳ לק״ג.</p>`;

  on(root, 'click', '[data-ctx]', (e, b) => { ctx = b.dataset.ctx; renderNutrition(root); });
  on(root, 'click', '[data-act="shuffle"]', () => { seed++; renderNutrition(root); });
  on(root, 'click', '[data-act="edit"]', () => { editDislikes = !editDislikes; renderNutrition(root); });
  on(root, 'click', '[data-dis]', (e, b) => { set((s2) => { toggle(s2.profile.dislikes, b.dataset.dis); return s2; }); renderNutrition(root); });
  on(root, 'click', '[data-food]', (e, b) => { set((s2) => { s2.profile.dislikedFoods ||= []; toggle(s2.profile.dislikedFoods, b.dataset.food); return s2; }); renderNutrition(root); });
  on(root, 'click', '[data-add]', (e, b) => {
    if (b.dataset.add === 'water') setDaily({ water: dd.water + 250 }); else setDaily({ protein: dd.protein + 20 });
    toast(b.dataset.add === 'water' ? '💧 נרשם' : '🥩 נרשם', 1200);
    renderNutrition(root);
  });
}

const tip = (x) => `<div class="tip"><div class="ti">${x.icon}</div><div><b>${esc(x.title)}</b><span>${esc(x.text)}</span></div></div>`;
function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
