// מסך תזונה: יעדים מול מה שנאכל בפועל (יומן אכילה עם חיפוש ב-190+ מזונות), תפריט יומי לפי הקשר (בסיס/שטח/בית),
// "לא אוכל", מזונות אישיים, מעקב שתייה, טיפים.
import { html, esc, on, toast, sheet } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, g } from '../store.js';
import { mealPlan, qtyLabel, dayTotals, foodLookup, searchFoods } from '../engine/nutrition.js';
import { FOOD, FOODS, DISLIKE_TAGS, NO_VEG_TIPS, ARMY_TIPS } from '../data/foods.js';

let ctx = 'base';
let seed = new Date().getDate();
let editDislikes = false;
let dislikeQuery = '';

const CATS = [['', 'הכל'], ['meal', 'מנות'], ['protein', 'חלבון'], ['dairy', 'חלב'], ['carb', 'פחמימה'], ['fruit', 'פירות'], ['veg', 'ירקות'], ['fat', 'שומנים'], ['snack', 'חטיפים'], ['custom', 'שלי']];
const QTYS = [0.5, 1, 1.5, 2, 3];
const MEAL_SLOTS = [['breakfast', '🌅 בוקר'], ['lunch', '🍽️ צהריים'], ['dinner', '🌙 ערב'], ['snack', '⚡ ביניים']];

function currentSlot() {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

export function renderNutrition(root) {
  const s = get();
  const p = s.profile;
  const custom = p.customFoods || [];
  const plan = mealPlan(p, { ctx, seed });
  const t = plan.targets;
  const dd = daily();
  const eaten = dayTotals(dd, custom);
  const ctxs = [['base', '🪖 בבסיס'], ['field', '🎒 בשטח'], ['home', '🏠 בבית']];
  const log = (dd.foods || []).map((it, i) => ({ ...it, i, f: foodLookup(it.id, custom) })).filter((x) => x.f);
  const left = t.kcal - eaten.kcal;

  root.innerHTML = html`<div class="eyebrow">תזונת לוחם</div><div class="h1">דלק לביצועים</div>
    <div class="card hud" style="margin-top:14px">
      <div class="row between"><div><div class="sub" style="font-size:12px">נאכל היום / יעד</div>
        <div class="num" style="font-size:32px;font-weight:800">${eaten.kcal.toLocaleString('he-IL')}<span class="sub" style="font-size:16px"> / ${t.kcal.toLocaleString('he-IL')} קק״ל</span></div>
        <div class="sub" style="font-size:13px">${left > 0 ? `נשארו <b class="num">${left.toLocaleString('he-IL')}</b> קלוריות` : `עברת את היעד ב-<b class="num">${(-left).toLocaleString('he-IL')}</b>`}</div></div>
        <span class="tag ${p.goal === 'cut' ? 'orange' : 'lime'}">${p.goal === 'cut' ? 'גירעון' : p.goal === 'muscle' ? 'עודף' : 'תחזוקה+'}</span></div>
      <div class="macro-rings" style="margin-top:14px">
        ${ring(Math.min(1, eaten.p / t.protein), { size: 72, stroke: 7, big: eaten.p, lbl: `חלבון /${t.protein}` })}
        ${ring(Math.min(1, eaten.c / t.carbs), { size: 72, stroke: 7, big: eaten.c, lbl: `פחמ׳ /${t.carbs}`, color: '#22e6d0' })}
        ${ring(Math.min(1, eaten.f / t.fat), { size: 72, stroke: 7, big: eaten.f, lbl: `שומן /${t.fat}`, color: '#ff8a3d' })}
        ${ring(Math.min(1, dd.water / (t.waterL * 1000)), { size: 72, stroke: 7, big: (dd.water / 1000).toFixed(1), lbl: `מים /${t.waterL}ל׳`, color: '#5aa9ff' })}
      </div>
      <div class="grid3" style="margin-top:14px">
        <button class="btn sm primary" data-act="add-food">＋ מה אכלתי</button>
        <button class="btn sm" data-add="water">💧 +250 מ״ל</button>
        <button class="btn sm" data-add="protein">🥩 +20 ג׳</button>
      </div>
    </div>

    <div class="h2">📒 יומן אכילה — היום${log.length ? `<span class="more" data-act="clear-log">ניקוי</span>` : ''}</div>
    <div class="card tight">
      ${log.length ? MEAL_SLOTS.map(([slot, label]) => {
        const items = log.filter((x) => (x.slot || 'snack') === slot);
        if (!items.length) return '';
        const k = items.reduce((a, x) => a + x.f.kcal * x.qty, 0);
        return html`<div class="log-slot"><div class="row between"><b>${label}</b><span class="sub num" style="font-size:12px">${Math.round(k)} קק״ל</span></div>
          ${items.map((x) => html`<button class="log-it" data-log="${x.i}"><span>${esc(x.f.name)}<small> · ${qtyLabel(x.qty)}${esc(x.f.portion)}</small></span>
            <span class="num sub">${Math.round(x.f.kcal * x.qty)} · ${Math.round(x.f.p * x.qty)}ג׳</span></button>`)}</div>`;
      }).join('') : `<div class="empty" style="padding:16px"><div class="e">🍽️</div>עוד לא נרשם אוכל היום.<br>${g('לחץ', 'לחצי')} "＋ מה אכלתי" או ${g('הוסף', 'הוסיפי')} ארוחה שלמה מהתפריט למטה.</div>`}
    </div>

    <div class="h2">🍽️ התפריט המומלץ<span class="more" data-act="shuffle">🎲 תפריט אחר</span></div>
    <div class="seg" style="margin-bottom:12px">${ctxs.map(([k, v]) => `<button data-ctx="${k}" class="${ctx === k ? 'on' : ''}">${v}</button>`)}</div>
    ${plan.meals.map((m, mi) => html`<div class="card tight meal">
      <div class="row between" style="margin-bottom:6px"><b>${m.icon} ${m.name}</b><span class="num sub" style="font-size:13px">${m.total.kcal} קק״ל · ${m.total.p}ג׳ חלבון</span></div>
      ${m.items.map((it) => { const f = FOOD[it.id]; return `<div class="mi"><span>${esc(f.name)}</span><small>${qtyLabel(it.qty)}${esc(f.portion)}</small></div>`; })}
      <button class="btn sm ghost" style="margin-top:6px" data-eat-meal="${mi}">✓ אכלתי את זה</button>
    </div>`)}
    <div class="sub" style="margin-top:8px;text-align:center">סה״כ: <span class="num">${plan.total.kcal}</span> קק״ל · <span class="num">${plan.total.p}</span>ג׳ חלבון · <span class="num">${plan.total.c}</span>ג׳ פחמימה · <span class="num">${plan.total.f}</span>ג׳ שומן</div>

    <div class="h2">🚫 מה אני לא אוכל<span class="more" data-act="edit">${editDislikes ? 'סיום ✓' : 'עריכה'}</span></div>
    <div class="card tight">
      ${editDislikes ? html`<div class="sub" style="margin-bottom:8px">קטגוריות:</div>
        <div class="chips">${Object.entries(DISLIKE_TAGS).map(([k, v]) => `<button class="chip no ${p.dislikes.includes(k) ? 'on' : ''}" data-dis="${k}">${v}</button>`)}</div>
        <div class="sub" style="margin:14px 0 8px">מאכלים ספציפיים:</div>
        <input class="input" data-dq placeholder="🔎 חיפוש מאכל…" value="${esc(dislikeQuery)}" style="height:44px;margin-bottom:10px">
        <div class="chips" id="dislikeChips">${dislikeChips(p)}</div>`
      : html`<div class="chips">${[...p.dislikes.map((k) => DISLIKE_TAGS[k]), ...(p.dislikedFoods || []).map((id) => FOOD[id]?.name)].filter(Boolean).map((x) => `<span class="chip no on">${esc(x)}</span>`).join('') || '<span class="sub">אוכל הכל 👌</span>'}</div>`}
    </div>

    ${plan.noVeg ? html`<div class="h2">🥦 בלי ירקות — ככה משלימים</div><div class="card tight">${NO_VEG_TIPS.map(tip)}</div>` : ''}
    <div class="h2">🪖 טיפים לחייל</div><div class="card tight">${ARMY_TIPS.map(tip)}</div>
    <p class="sub" style="font-size:12px;margin-top:12px">ההמלצות כלליות ואינן תחליף לייעוץ של דיאטנית/רופא. ערכי המזון משוערים למנה טיפוסית. חישוב: Mifflin-St Jeor × פעילות קרבית, חלבון ${p.goal === 'cut' ? '2.2' : '2.0'} ג׳ לק״ג.</p>`;

  const rerender = () => renderNutrition(root);
  on(root, 'click', '[data-ctx]', (e, b) => { ctx = b.dataset.ctx; rerender(); });
  on(root, 'click', '[data-act="shuffle"]', () => { seed++; rerender(); });
  on(root, 'click', '[data-act="edit"]', () => { editDislikes = !editDislikes; rerender(); });
  on(root, 'click', '[data-act="add-food"]', () => foodSearchSheet(rerender));
  on(root, 'click', '[data-act="clear-log"]', () => { setDaily({ foods: [] }); rerender(); });
  on(root, 'click', '[data-log]', (e, b) => logItemSheet(Number(b.dataset.log), rerender));
  on(root, 'click', '[data-eat-meal]', (e, b) => {
    const m = plan.meals[Number(b.dataset.eatMeal)];
    const slot = m.id === 'breakfast' ? 'breakfast' : m.id === 'lunch' ? 'lunch' : m.id === 'dinner' ? 'dinner' : 'snack';
    const foods = [...(daily().foods || []), ...m.items.map((it) => ({ id: it.id, qty: it.qty, slot, at: Date.now() }))];
    setDaily({ foods });
    toast(`✓ ${m.name} נרשמה ביומן`, 1500);
    rerender();
  });
  on(root, 'click', '[data-dis]', (e, b) => { set((s2) => { toggle(s2.profile.dislikes, b.dataset.dis); return s2; }); rerender(); });
  on(root, 'click', '[data-food]', (e, b) => { set((s2) => { s2.profile.dislikedFoods ||= []; toggle(s2.profile.dislikedFoods, b.dataset.food); return s2; }); b.classList.toggle('on'); });
  root.querySelector('[data-dq]')?.addEventListener('input', (e) => { dislikeQuery = e.target.value; root.querySelector('#dislikeChips').innerHTML = dislikeChips(get().profile); });
  on(root, 'click', '[data-add]', (e, b) => {
    const d2 = daily();
    if (b.dataset.add === 'water') setDaily({ water: d2.water + 250 }); else setDaily({ protein: d2.protein + 20 });
    toast(b.dataset.add === 'water' ? '💧 נרשם' : '🥩 נרשם', 1200);
    rerender();
  });
}

function dislikeChips(p) {
  const list = dislikeQuery ? searchFoods(dislikeQuery, [], { limit: 60 }) : FOODS.filter((f) => f.cat !== 'meal').slice(0, 40);
  return list.map((f) => `<button class="chip no ${(p.dislikedFoods || []).includes(f.id) ? 'on' : ''}" data-food="${f.id}">${esc(f.name)}</button>`).join('')
    + (dislikeQuery ? '' : '<span class="sub" style="font-size:12px;align-self:center">…חפש כדי לראות עוד</span>');
}

// ───── חיפוש והוספת מזון ─────
export function foodSearchSheet(onDone) {
  let q = '', cat = '', slot = currentSlot();
  const custom = () => get().profile.customFoods || [];
  sheet(html`<div class="eyebrow">יומן אכילה</div><div class="h1" style="font-size:22px">מה ${g('אכלת', 'אכלת')}?</div>
    <div class="seg" data-slot style="margin:10px 0">${MEAL_SLOTS.map(([k, v]) => `<button data-sl="${k}" class="${slot === k ? 'on' : ''}">${v}</button>`).join('')}</div>
    <input class="input" data-q placeholder="🔎 חיפוש: שניצל, קוטג׳, במבה…" autocomplete="off">
    <div class="chips" style="margin:10px 0;flex-wrap:nowrap;overflow-x:auto;padding-bottom:4px">${CATS.map(([k, v]) => `<button class="chip ${k === cat ? 'on' : ''}" data-cat="${k}" style="flex:0 0 auto">${v}</button>`).join('')}</div>
    <div id="fres" class="food-res"></div>
    <button class="btn block" style="margin-top:12px" data-custom>＋ מזון שלא ברשימה</button>`, {
    onMount(sh, close) {
      const paint = () => {
        const res = searchFoods(q, custom(), { cat: cat || null, limit: 50 });
        sh.querySelector('#fres').innerHTML = res.length ? res.map((f) => html`<button class="food-row" data-pick="${f.id}">
          <span><b>${esc(f.name)}</b><small>${esc(f.portion)}${f.custom ? ' · שלי' : ''}</small></span>
          <span class="num"><b>${f.kcal}</b><small>${Math.round(f.p)}ג׳ חלבון</small></span></button>`).join('')
          : '<div class="empty" style="padding:14px">לא נמצא. אפשר להוסיף "מזון שלא ברשימה" 👇</div>';
      };
      const inp = sh.querySelector('[data-q]');
      inp.addEventListener('input', () => { q = inp.value; paint(); });
      on(sh, 'click', '[data-cat]', (e, b) => { cat = b.dataset.cat; sh.querySelectorAll('[data-cat]').forEach((x) => x.classList.toggle('on', x === b)); paint(); });
      on(sh, 'click', '[data-sl]', (e, b) => { slot = b.dataset.sl; sh.querySelectorAll('[data-sl]').forEach((x) => x.classList.toggle('on', x === b)); });
      on(sh, 'click', '[data-pick]', (e, b) => { const f = foodLookup(b.dataset.pick, custom()); close(); qtySheet(f, slot, onDone); });
      sh.querySelector('[data-custom]').addEventListener('click', () => { close(); customFoodSheet(slot, onDone, q); });
      paint();
    },
  });
}

function qtySheet(f, slot, onDone) {
  let qty = 1;
  const line = () => `<b class="num">${Math.round(f.kcal * qty)}</b> קק״ל · <b class="num">${Math.round(f.p * qty)}</b>ג׳ חלבון · <b class="num">${Math.round(f.c * qty)}</b>ג׳ פחמ׳ · <b class="num">${Math.round(f.f * qty)}</b>ג׳ שומן`;
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">מנה: ${esc(f.portion)}</div>
    <div class="sub" style="margin:14px 0 6px">כמות</div>
    <div class="seg" data-qty>${QTYS.map((v) => `<button data-qv="${v}" class="${v === qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <div class="card tight" style="margin-top:12px" id="qline">${line()}</div>
    <button class="btn primary block xl" style="margin-top:14px" data-ok>הוסף ליומן</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-qv]', (e, b) => { qty = Number(b.dataset.qv); sh.querySelectorAll('[data-qv]').forEach((x) => x.classList.toggle('on', x === b)); sh.querySelector('#qline').innerHTML = line(); });
      sh.querySelector('[data-ok]').addEventListener('click', () => {
        setDaily({ foods: [...(daily().foods || []), { id: f.id, qty, slot, at: Date.now() }] });
        toast(`✓ ${f.name} נרשם`, 1300);
        close(); onDone?.();
      });
    },
  });
}

function logItemSheet(i, onDone) {
  const dd = daily();
  const it = dd.foods[i];
  const f = foodLookup(it.id, get().profile.customFoods || []);
  sheet(html`<div class="h1" style="font-size:22px">${esc(f.name)}</div><div class="sub">${qtyLabel(it.qty)}${esc(f.portion)} · ${Math.round(f.kcal * it.qty)} קק״ל</div>
    <div class="sub" style="margin:14px 0 6px">שינוי כמות</div>
    <div class="seg">${QTYS.map((v) => `<button data-qv="${v}" class="${v === it.qty ? 'on' : ''}">${v === 0.5 ? '½' : v === 1.5 ? '1½' : v}</button>`).join('')}</div>
    <button class="btn danger block" style="margin-top:14px" data-del>🗑 הסר מהיומן</button>
    <button class="btn ghost block" style="margin-top:8px" data-close>סגור</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-qv]', (e, b) => { const foods = [...daily().foods]; foods[i] = { ...foods[i], qty: Number(b.dataset.qv) }; setDaily({ foods }); close(); onDone?.(); });
      sh.querySelector('[data-del]').addEventListener('click', () => { const foods = daily().foods.filter((_, j) => j !== i); setDaily({ foods }); close(); onDone?.(); });
    },
  });
}

function customFoodSheet(slot, onDone, prefill = '') {
  sheet(html`<div class="eyebrow">מזון אישי</div><div class="h1" style="font-size:22px">הוספת מזון חדש</div>
    <p class="sub">יישמר אצלך ויופיע בחיפוש בפעם הבאה. אפשר להעתיק ערכים מהתווית שעל האריזה.</p>
    <label class="field"><span>שם</span><input class="input" name="name" value="${esc(prefill)}"></label>
    <label class="field"><span>מנה (למשל: יחידה, 100 ג׳)</span><input class="input" name="portion" value="מנה"></label>
    <div class="grid2">
      <label class="field"><span>קלוריות</span><input class="input num" name="kcal" type="number" inputmode="numeric"></label>
      <label class="field"><span>חלבון (ג׳)</span><input class="input num" name="p" type="number" inputmode="decimal"></label>
      <label class="field"><span>פחמימות (ג׳)</span><input class="input num" name="c" type="number" inputmode="decimal"></label>
      <label class="field"><span>שומן (ג׳)</span><input class="input num" name="f" type="number" inputmode="decimal"></label>
    </div>
    <button class="btn primary block xl" data-save>שמור והוסף ליומן</button>`, {
    onMount(sh, close) {
      sh.querySelector('[data-save]').addEventListener('click', () => {
        const v = (n) => sh.querySelector(`[name=${n}]`).value.trim();
        const name = v('name'), kcal = Number(v('kcal'));
        if (!name || !kcal) { toast('צריך לפחות שם וקלוריות'); return; }
        const food = { id: `c_${Date.now()}`, name, portion: v('portion') || 'מנה', kcal, p: Number(v('p')) || 0, c: Number(v('c')) || 0, f: Number(v('f')) || 0, cat: 'custom', tags: [], ctx: ['base', 'home', 'field'], custom: true };
        set((s2) => { (s2.profile.customFoods ||= []).push(food); return s2; });
        setDaily({ foods: [...(daily().foods || []), { id: food.id, qty: 1, slot, at: Date.now() }] });
        toast(`✓ ${name} נשמר ונרשם`);
        close(); onDone?.();
      });
    },
  });
}

const tip = (x) => `<div class="tip"><div class="ti">${x.icon}</div><div><b>${esc(x.title)}</b><span>${esc(x.text)}</span></div></div>`;
function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }
