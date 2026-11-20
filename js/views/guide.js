// מדריך שימוש: נפתח אוטומטית בפתיחה הראשונה, ואפשר לפתוח שוב בכל רגע (כפתור "?" במסך הבית / מסך המאמן / #/guide).
import { html, el, on, icon, em, ib } from '../ui/dom.js';
import { COACHES } from '../data/coaches.js';
import { get, set } from '../store.js';
import { unlock } from '../coach/voice.js';
import { platform, platformName, installSteps, installOneLine } from '../install.js';

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const step = (n, t, d) => `<div class="g-step"><span class="g-n num">${n}</span><div><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></div>`;
const tip = (i, t) => `<div class="g-tip">${em(i, 'acc', 'sm')}<div>${t}</div></div>`;

function slides() {
  const p = get().profile;
  const coach = COACHES[p?.coach || 'ori'];
  return [
    {
      // שקף פתיחה בעיצוב משלו: שני המאמנים, שם האפליקציה ושלוש הבטחות קצרות
      id: 'welcome', hero: true,
      visual: `<div class="g-trio">${['ori', 'noa'].map((c) => `<figure><img src="${COACHES[c].img}" alt=""><figcaption><b>${COACHES[c].name}</b><span>${COACHES[c].title}</span></figcaption></figure>`).join('')}</div>`,
      body: `<div class="g-brand">חוד</div><h2>מאמן אישי וירטואלי שבונה לוחם</h2>
        <div class="g-feats">
          <div>${ib('dumbbell', 'pri')}<span><b>כוח, ריצה ותזונה</b>תוכנית אחת שמכינה לשטח ולמסעות</span></div>
          <div>${ib('vol', 'acc')}<span><b>מאמן שמדבר איתך</b>מדגים כל תרגיל, סופר חזרות ומודד מנוחות</span></div>
          <div>${ib('chart', 'ok')}<span><b>תוכנית שמתקדמת איתך</b>משתנה לבד לפי הביצועים שלך</span></div>
        </div>
        <p class="g-note">המדריך לוקח דקה. אפשר לחזור אליו תמיד מההגדרות.</p>`,
    },
    {
      id: 'install', title: 'שלב 1 · מתקינים על הטלפון', eyebrow: 'פעם אחת',
      visual: `${em('📲', 'pri', 'xl')}`,
      body: (standalone() ? tip('✅', 'האפליקציה כבר מותקנת על המסך הראשי. מעולה!') : '') +
        `<div class="sub" style="font-size:13px;margin:0 0 4px">ההוראות למכשיר שלך: <b>${platformName()}</b></div>` +
        installSteps().map(([t, d], i) => step(i + 1, t, d)).join('') +
        tip('📱', `<b>במכשיר אחר?</b> ${['ios-safari', 'ios-chrome', 'android'].filter((p) => p !== platform()).map(installOneLine).join(' ')}`) +
        tip('🔄', 'האפליקציה <b>מתעדכנת לבד</b> — לא צריך להוריד כלום שוב.') +
        tip('🔔', 'רק מהאפליקציה המותקנת אפשר להפעיל <b>תזכורות</b> (אימון, שתייה, שקילה): הגדרות ← תזכורות.') +
        tip('📴', 'עובדת גם בלי קליטה (אחרי הפתיחה הראשונה).'),
    },
    {
      id: 'setup', title: 'שלב 2 · ההגדרות הראשונות', eyebrow: '2 דקות',
      visual: `${em('⚙️', 'pri', 'xl')}`,
      body: step(1, 'בוחרים מאמן', 'אורי או נועה — אפשר להחליף אחר כך') +
        step(2, 'פרטים אישיים', 'לשון פנייה (זכר/נקבה), שם, גיל, גובה, משקל ומשקל יעד') +
        step(3, 'מטרה', 'כושר קרבי / מסה / כוח / חיטוב') +
        step(4, 'מבדק רמה', 'שכיבות סמיכה ומתח מקסימליים, זמן 3 ק״מ — לענות בכנות. מי שיודע כמה הוא מרים בלחיצת חזה, בסקוואט ובדדליפט יכול להוסיף (לא חובה) — והאימון הראשון יתחיל במשקל הנכון') +
        step(5, 'זמנים', 'כמה אימונים בשבוע וכמה דקות כל אימון') +
        step(6, 'פציעות', 'תרגילים שלא מתאימים לא ייכנסו לתוכנית') +
        step(7, 'ליווי תזונה — רק אם רוצים', 'בוחרים "כן" או "רק אימונים". מי שבוחר כן עונה על כמה שאלות קצרות: סוג התזונה, כשרות, מספר הארוחות, אלרגיות ומה לא אוכלים. אפשר להפעיל או לכבות אחר כך') +
        tip('🎯', 'לא צריך לדייק — <b>הרמה מתעדכנת אוטומטית</b> לפי הביצועים.'),
    },
    {
      id: 'home', title: 'מסך הבית', eyebrow: 'כל יום',
      visual: `<div class="g-mock"><div class="gm-card"><small>האימון הבא</small><b>פלג עליון A</b><span class="gm-btn">התחל אימון</span></div>
        <div class="gm-row"><span class="gm-ring num">64%</span><div><b>התזונה של היום</b><small>נשארו 780 קק״ל · הארוחה הבאה</small></div></div></div>`,
      body: tip('🎯', '<b>האימון הבא</b> — תמיד בראש המסך. לא צמוד לימים בשבוע: פשוט עושים את הבא.') +
        tip('🍽️', '<b>התזונה של היום</b> — כמה קלוריות נשארו, חלבון, פחמימה ושומן, והארוחה הבאה. מופיע למי שבחר בליווי תזונה; הקשה פותחת את מסך התזונה.') +
        tip('💧', '<b>ארבעה אריחים</b> — מים, משקל, מוכנות וכושר. הקשה אחת על אריח.') +
        tip('📊', '<b>הכושר שלך</b> — ציון מ-0 עד 100 שמורכב מכוח, סבולת, עקביות וגוף. בהתחלה (וגם אחרי איפוס) הוא ריק ומסומן "עוד לא נמדד" — זה תקין. כל חלק מתמלא כשיש לו נתונים: <b>כוח</b> אחרי אימון כוח, <b>סבולת</b> אחרי מבדק 3 ק״מ, <b>גוף</b> אחרי שקילה שנייה.') +
        tip('💪', 'רוצים הערכת כוח כבר עכשיו? מזינים את ההרמות ב<b>הגדרות ← פרופיל ויעדים</b>.') +
        tip('🎒', '<b>אין חדר כושר?</b> כפתור "אימון בלי ציוד".') +
        tip('⚙️', `<b>כפתור הגדרות למעלה</b> — החלפת מאמן, מראה בהיר/כהה, שעון, גיבוי והמדריך הזה.`),
    },
    {
      id: 'workout', title: 'איך מתאמנים עם המאמן', eyebrow: 'הכי חשוב',
      visual: `<div class="g-mock"><div class="gm-tempo"><span class="num">4</span><small>מתוך 10</small></div><div class="gm-phase"><span class="ph-ico go-down">${icon('phDown')}</span>ירידה &nbsp;·&nbsp; <span class="ph-ico go-up">${icon('phUp')}</span>עלייה</div></div>`,
      body: step(0, 'צ׳ק־אין קצר', '4 שאלות (שינה, אנרגיה, כאבים, עומס) — המאמן מתאים את העומס להיום') + step(1, 'חימום מודרך', '5 תנועות קצרות — המאמן מדגים וסופר, עובר לבד לתנועה הבאה') +
        step(2, 'מסתכלים על ההדגמה', 'מכוונים משקל וחזרות עם + / −. "הסבר" = דגשי ביצוע') +
        step(3, 'לוחצים "התחל סט"', 'המאמן סופר "3, 2, 1… יאללה!" — ומתחילים יחד איתו') +
        step(4, 'עובדים בקצב של המאמן', '"ירידה… עלייה!" + מספר כל חזרה. הווידאו זז בדיוק בקצב') +
        step(5, 'מדרגים את הסט', 'קל / טוב / קשה / עד הקצה — לפי זה המשקל עולה או יורד') +
        step(6, 'מנוחה', 'טיימר עם ספירה לאחור. "דלג" או "+30" לפי הצורך') +
        tip('🧘', 'בסוף האימון — <b>מתיחות לפי השרירים שעבדו</b>. אפשר לדלג.') +
        tip('🔁', '<b>המכשיר תפוס?</b> "החלף תרגיל". <b>רוצים בלי ספירה?</b> "סיימתי בלי ספירה".') +
        tip('🔊', 'להגביר ווליום. הקול עובד גם כשהטלפון על שקט. אם אין קול — לגעת פעם אחת במסך.') +
        tip('🎵', '<b>מוזיקת רקע</b>: כפתור התו בראש מסך האימון, או הגדרות ← מוזיקת רקע. המוזיקה מתחלפת לפי אופי התרגיל, ומנמיכה את עצמה כשהמאמן מדבר.') +
        tip('📸', '<b>שיתוף האימון</b>: במסך הסיכום, "שיתוף האימון" מכין תמונה עם שם האימון, הזמן והמספרים — לשליחה בוואטסאפ או לסטורי. בלי השם שלך ובלי נתוני גוף.') +
        tip('📺', '<b>מצב טלוויזיה</b>: באימון בבית אפשר לסובב את הטלפון לרוחב (או ללחוץ על סמל המסך למעלה), ולהפעיל שיקוף מסך לטלוויזיה — AirPlay באייפון, Cast באנדרואיד. ההדגמה בצד אחד, ושעון גדול בצד השני.'),
    },
    {
      id: 'run', title: 'ריצה', eyebrow: 'משולבת בתוכנית',
      visual: `${em('🏃', 'pri', 'xl')}`,
      body: tip('', 'אינטרוולים, טמפו וריצה קלה — המאמן מכריז על כל קטע ("ספרינט!", "הליכה", "עוד דקה").') +
        tip('📡', 'מאשרים <b>הרשאת מיקום</b> — מרחק וקצב מה-GPS. להשאיר את המסך דלוק.') +
        tip('🏁', 'בשבוע הרביעי של כל בלוק — <b>מבדק 3 ק״מ</b>. המאמן מזהה לבד כשמגיעים ל-3 ק״מ.') +
        tip('❤', 'יש שעון Garmin? אפשר לחבר דופק חי או לייבא ריצות (הגדרות ← Garmin).'),
    },
    {
      id: 'progress', title: 'התוכנית מתקדמת איתך', eyebrow: 'אוטומטי',
      visual: `<div class="g-mock"><div class="gm-bars"><i style="height:30%"></i><i style="height:45%"></i><i style="height:55%"></i><i style="height:75%"></i><i class="on" style="height:95%"></i></div></div>`,
      body: tip('📈', '<b>השלמת את כל החזרות?</b> בפעם הבאה המשקל עולה. היה קשה מדי? יורד.') +
        tip('🗓️', 'כל 4 שבועות = בלוק: בסיס → בנייה → שיא → פריקה. אחרי כל בלוק — <b>הערכת רמה</b>.') +
        tip('📊', 'מסך "התקדמות": <b>סיכום שבועי</b> מול השבוע שעבר, משקל עם מגמה, כוח (1RM), ריצה, ומפת שרירים שבועית.') +
        tip('✏️', 'טעות ברישום? לוחצים על אימון בהיסטוריה — <b>עריכה או מחיקה</b>.') +
        tip('🎖️', 'XP ודרגות: טירון → לוחם → … → אגדת חטיבה.'),
    },
    {
      id: 'food', title: 'תזונה', eyebrow: 'דלק ללוחם',
      visual: `${em('🍽️', 'pri', 'xl')}`,
      body: tip('🎯', 'יעד קלוריות וחלבון יומי מחושב לפי המשקל והמטרה.') +
        tip('📒', '<b>היום</b>: "הוספת אוכל" — חיפוש ב-600+ מאכלים, עם אחרונים ומועדפים, או <b>סריקת ברקוד</b> של מוצר ארוז. בלשונית <b>תפריט</b>: "אכלתי" רושם ארוחה שלמה.') +
        tip('🪖', 'תפריט לפי מקום: <b>בבסיס</b> (חדר אוכל), <b>בשטח</b>, <b>בבית</b>. כל ארוחה היא <b>מנה אמיתית</b> עם כמויות, שמתאימה ליעד של אותו יום.') +
        tip('🔁', '<b>לא מתאים?</b> לוחצים על שם המנה כדי להחליף את המנה כולה, או על פריט כדי להחליף רק אותו. "תפריט אחר" בונה יום חדש.') +
        tip('🚫', 'בלשונית <b>העדפות</b>: סוג התזונה (הכול / צמחוני / טבעוני), כשרות, מספר הארוחות, אלרגיות ו"מה אני לא אוכל" — מה שסומן לא יופיע בתפריט. בלי ירקות? יש טיפים להשלמה.') +
        tip('⚖️', '<b>ליווי תזונה הוא בחירה</b>: מי שדילג בהיכרות יכול להפעיל אותו במסך התזונה, ואפשר גם לכבות. בהיריון, בהנקה, במצב רפואי, מתחת לגיל 18 או בתת־משקל אין יעד של גירעון קלורי — מסמנים בהעדפות.'),
    },
    {
      id: 'go', title: 'מוכנים?', eyebrow: 'עוד דבר אחד',
      visual: `<div class="g-coach"><img src="${coach.img}" alt=""></div>`,
      body: tip('💪', '<b>עקביות מנצחת עוצמה.</b> עדיף 3 אימונים טובים בשבוע מ-6 חצאי אימונים.') +
        tip('😴', 'שינה, מים וחלבון — חצי מההתקדמות קורית מחוץ לחדר הכושר.') +
        tip('⚠️', 'כאב חד = עוצרים. לפני תוכנית אימונים מומלץ אישור רפואי.') +
        tip('💾', 'הנתונים נשמרים רק בטלפון. האפליקציה תזכיר לגבות פעם בחודש — הקובץ נשמר ב"קבצים" או ב-iCloud.'),
    },
  ];
}

// renderGuide: מסך מלא. onDone נקרא בסיום/דילוג.
export function openGuide({ onDone, first = false } = {}) {
  document.querySelector('.guide')?.remove();
  const S = slides();
  let i = 0;
  const root = el(`<div class="guide" role="dialog" aria-label="מדריך שימוש">
    <div class="g-top"><div class="g-dots">${S.map(() => '<i></i>').join('')}</div><button class="g-skip" data-g="skip">${first ? 'דלג' : 'סגור ✕'}</button></div>
    <div class="g-track">${S.map((s) => html`<section class="g-slide ${s.hero ? 'g-hero' : ''}" data-id="${s.id}"><div class="g-visual">${s.visual}</div>
      <div class="g-body">${s.hero ? s.body : `<div class="eyebrow">${s.eyebrow}</div><h2>${s.title}</h2>${s.body}`}</div></section>`).join('')}</div>
    <div class="g-nav"><button class="btn" data-g="prev">הקודם</button><button class="btn primary xl" data-g="next">הבא</button></div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const track = root.querySelector('.g-track');

  const paint = () => {
    root.querySelectorAll('.g-dots i').forEach((d, j) => d.classList.toggle('on', j <= i));
    root.querySelector('[data-g="prev"]').style.display = i ? '' : 'none'; // בשקף הראשון כפתור "הבא" ברוחב מלא
    root.querySelector('[data-g="next"]').textContent = i === S.length - 1 ? (first ? 'בוא נתחיל' : 'סיום ✓') : 'הבא';
  };
  const at = () => Math.round(Math.abs(track.scrollLeft) / (track.clientWidth || 1));
  // מעבר בכפתור: בזמן ההחלקה המונפשת לא מסנכרנים את המיקום מהגלילה (אחרת עצירה רגעית מחזירה לשקף הקודם),
  // ואם ההנפשה לא הגיעה ליעד (קורה באייפון, עם scroll-snap) — קופצים אליו בלי הנפשה. כך לחיצה אחת תמיד מספיקה.
  let st, nav = 0;
  const go = (n) => {
    i = Math.max(0, Math.min(S.length - 1, n));
    const target = i;
    clearTimeout(st); clearTimeout(nav);
    track.children[i].querySelector('.g-body').scrollTop = 0;
    track.children[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    paint();
    nav = setTimeout(() => {
      nav = 0;
      if (i === target && at() !== target) {
        track.style.scrollSnapType = 'none';
        track.children[target].scrollIntoView({ behavior: 'auto', inline: 'start', block: 'nearest' });
        requestAnimationFrame(() => { track.style.scrollSnapType = ''; });
      }
    }, 600);
  };
  // החלקה באצבע מעדכנת את המיקום
  track.addEventListener('scroll', () => {
    if (nav) return;
    clearTimeout(st);
    st = setTimeout(() => {
      const n = at();
      if (!nav && n !== i) { i = n; paint(); }
    }, 120);
  }, { passive: true });
  // נגיעה באצבע במסלול מבטלת את ההמתנה: מכאן המיקום שוב נקבע לפי הגלילה
  track.addEventListener('touchstart', () => { clearTimeout(nav); nav = 0; }, { passive: true });

  const close = () => {
    set((s) => { s.guideSeen = true; return s; });
    root.remove();
    document.body.style.overflow = '';
    onDone?.();
  };
  on(root, 'click', '[data-g]', (e, b) => {
    unlock();
    const a = b.dataset.g;
    if (a === 'skip') close();
    if (a === 'prev') go(i - 1);
    if (a === 'next') (i === S.length - 1 ? close() : go(i + 1));
  });
  paint();
}
