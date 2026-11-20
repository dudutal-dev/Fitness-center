// מסך "התוכנית שלך": מוצג פעם אחת, מיד אחרי ההיכרות ובניית התוכנית — לפני מסך הבית.
// מציג מה נבנה: שבוע האימונים והריצות, ויעדי התזונה עם תפריט לדוגמה.
import { html, esc, on, el, icon, ib, emi } from '../ui/dom.js';
import { get, set } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { FOOD } from '../data/foods.js';
import { GOALS, LEVEL_NAMES } from '../engine/program.js';
import { mealPlan, wantsNutrition } from '../engine/nutrition.js';
import { estMinutes } from './home.js';

const CTX = 'base'; // התפריט לדוגמה: מה שיש בחדר האוכל בבסיס

export function openPlanIntro(onDone) {
  document.querySelector('.plan-intro')?.remove();
  const s = get(), p = s.profile, week = s.plan.week;
  const coaches = [COACHES[p.coach]];
  const fem = p.sex === 'f';
  const plan = mealPlan(p, { ctx: CTX, seed: new Date().getDate() });
  const t = plan.targets;
  const kcalOf = (g, per) => Math.round(g * per);
  const pct = (g, per) => Math.round((kcalOf(g, per) / Math.max(1, t.kcal)) * 100);
  const energy = t.delta < 0 ? `גירעון של ${Math.abs(t.delta)} קק״ל ביום — ירידה איטית ששומרת על השריר` : t.delta > 0 ? `עודף של ${t.delta} קק״ל ביום — לבניית שריר בלי לצבור שומן מיותר` : 'איזון קלורי — אוכלים כמה ששורפים';
  const runs = week.sessions.filter((x) => x.run).length;

  const root = el(html`<div class="plan-intro" role="dialog" aria-label="התוכנית שלך">
    <div class="pi-scroll">
      <div class="pi-head">
        <div class="pi-faces">${coaches.map((c) => `<img src="${c.face}" alt="${c.name}">`).join('')}</div>
        <div class="eyebrow">התוכנית מוכנה</div>
        <div class="h1">${esc(p.name)}, זו התוכנית שלך</div>
        <p class="sub">${coaches[0].name} ${p.coach === 'noa' ? 'בנתה' : 'בנה'} אותה לפי מה שסיפרת. ${p.coach === 'noa' ? 'היא' : 'התוכנית'} תשתנה מעצמה לפי הביצועים שלך — ואפשר לשנות כל דבר בהגדרות.</p>
      </div>

      <div class="h2">${ib('dumbbell', 'pri', 'sm')} אימונים</div>
      <div class="card tight">
        <div class="pi-kpis">
          <div><b class="num">${week.sessions.length}</b><span>אימונים בשבוע</span></div>
          <div><b class="num">${p.sessionMin}</b><span>דקות לאימון</span></div>
          <div><b>רמה ${p.level}</b><span>${LEVEL_NAMES[p.level]}</span></div>
        </div>
        <div class="pi-goal">${icon(GOALS[p.goal].icon)} <b>${GOALS[p.goal].name}</b> · מחזור של 12 שבועות</div>
      </div>
      <div class="card tight pi-week">
        ${week.sessions.map((x) => html`<div class="pi-day"><span class="dn num">${x.day}</span>
          <div class="grow"><b>${esc(x.name)}</b><span>${esc(x.focus)}</span></div>
          <small>~${estMinutes(x)} דק׳${x.run ? ` · ${emi(x.run.icon)} ריצה` : ''}</small></div>`)}
        <div class="sub t-foot" style="margin-top:8px">האימונים לא צמודים לימים בשבוע: פשוט עושים את הבא בתור — גם כשהלו״ז בצבא משתנה.${runs ? ` ${runs === 1 ? 'אחד מהם כולל' : `${runs} מהם כוללים`} גם ריצה.` : ''}</div>
      </div>
      ${`<div class="card tight"><b>המשקלים</b><div class="sub t-foot" style="margin-top:4px">באימון הראשון המשקלים שמרניים בכוונה. אחרי כל סט ${fem ? 'מדרגת' : 'מדרג'} כמה היה קשה, והמשקל הבא מתכוונן לפי זה.</div></div>`}

      ${wantsNutrition(p) ? html`<div class="h2">${ib('food', 'pri', 'sm')} תזונה</div>
      <div class="card tight">
        <div class="pi-kcal"><b class="num">${t.kcal.toLocaleString('he-IL')}</b><span>קק״ל ביום</span></div>
        <div class="sub t-foot" style="text-align:center;margin-bottom:10px">${energy}</div>
        <div class="pi-macros">
          <div><i style="background:var(--pri)"></i><b class="num">${t.protein} ג׳</b><span>חלבון · ${pct(t.protein, 4)}%</span></div>
          <div><i style="background:var(--acc)"></i><b class="num">${t.carbs} ג׳</b><span>פחמימה · ${pct(t.carbs, 4)}%</span></div>
          <div><i style="background:var(--orange)"></i><b class="num">${t.fat} ג׳</b><span>שומן · ${pct(t.fat, 9)}%</span></div>
        </div>
        <div class="pi-bar"><i style="width:${pct(t.protein, 4)}%;background:var(--pri)"></i><i style="width:${pct(t.carbs, 4)}%;background:var(--acc)"></i><i style="width:${pct(t.fat, 9)}%;background:var(--orange)"></i></div>
        <div class="sub t-foot" style="margin-top:10px">${ib('drop', 'acc', 'sm')} ${t.waterL} ליטר מים ביום · ${t.fiber} ג׳ סיבים · חלבון: ${t.perKg} ג׳ לכל ק״ג משקל גוף</div>
      </div>
      <div class="card tight"><b>יום לדוגמה</b><span class="sub t-foot"> · ${plan.total.kcal.toLocaleString('he-IL')} קק״ל · ${plan.total.p} ג׳ חלבון</span>
        ${plan.meals.map((m) => html`<div class="pi-meal"><div class="pm-top"><b>${emi(m.icon)} ${m.name}</b><span class="num">${m.total.kcal} קק״ל</span></div>
          <div class="sub">${m.dish ? esc(m.dish.name) : m.items.map((it) => esc(FOOD[it.id].name)).join(' · ')}</div></div>`)}
        <div class="sub t-foot" style="margin-top:8px">${(p.dislikes || []).length ? `התפריט נבנה בלי מה שסימנת ש${fem ? 'את לא אוכלת' : 'אתה לא אוכל'}. ` : ''}זו הצעה, לא חובה: במסך התזונה יש תפריט מתחלף לפי מקום (בבסיס, בשטח, בבית), ורישום של מה שאוכלים בפועל.</div>
      </div>
` : ''}
      <p class="sub t-foot" style="text-align:center;margin:14px 0 6px">לפני תחילת תוכנית אימונים מומלץ אישור רפואי. כאב חד — עוצרים.</p>
    </div>
    <div class="pi-actions">
      <div class="grid2"><button class="btn sm" data-go="plan" ${wantsNutrition(p) ? '' : 'style="grid-column:1/-1"'}>${icon('plan', 'width="16" height="16"')} התוכנית המלאה</button>${wantsNutrition(p) ? `<button class="btn sm" data-go="nutrition">${icon('food', 'width="16" height="16"')} מסך התזונה</button>` : ''}</div>
      <button class="btn primary block xl" data-go="home">${fem ? 'מעולה, בואי נתחיל' : 'מעולה, בוא נתחיל'}</button>
    </div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  on(root, 'click', '[data-go]', (e, b) => {
    set((st) => { st.planSeen = true; return st; });
    root.remove();
    document.body.style.overflow = '';
    onDone(b.dataset.go);
  });
}
