// מאגר מזון מותאם לחייל: חדר אוכל בבסיס, שטח, ובית. ערכים למנה אחת (קירוב).
// cat: protein | carb | fat | fruit | veg | dairy | snack ; ctx: base / field / home
export const DISLIKE_TAGS = {
  vegetables: 'ירקות', fruit: 'פירות', fish: 'דגים', tuna: 'טונה', eggs: 'ביצים', dairy: 'מוצרי חלב', cottage: 'קוטג׳',
  legumes: 'קטניות', nuts: 'אגוזים', chicken: 'עוף', red_meat: 'בשר אדום', rice: 'אורז', pasta: 'פסטה', oats: 'שיבולת שועל',
  hummus: 'חומוס', tahini: 'טחינה', avocado: 'אבוקדו', bread: 'לחם', spicy: 'חריף', peanut: 'חמאת בוטנים',
};

const F = (id, name, portion, kcal, p, c, f, cat, tags = [], ctx = ['base', 'home']) => ({ id, name, portion, kcal, p, c, f, cat, tags, ctx });

export const FOODS = [
  // חלבון
  F('chicken_breast', 'חזה עוף בגריל', '150 ג׳', 250, 46, 0, 6, 'protein', ['chicken']),
  F('schnitzel', 'שניצל עוף', '1 יחידה (150 ג׳)', 360, 32, 18, 17, 'protein', ['chicken']),
  F('pargit', 'פרגית', '150 ג׳', 300, 38, 0, 16, 'protein', ['chicken']),
  F('turkey_slices', 'פסטרמה הודו', '100 ג׳', 110, 20, 3, 2, 'protein', ['chicken'], ['base', 'home', 'field']),
  F('beef_patty', 'קציצות בקר', '3 יחידות', 330, 27, 9, 20, 'protein', ['red_meat']),
  F('steak', 'סטייק / אנטריקוט', '200 ג׳', 450, 50, 0, 27, 'protein', ['red_meat'], ['home']),
  F('eggs', 'ביצים (חביתה/קשה)', '3 ביצים', 230, 19, 1, 16, 'protein', ['eggs'], ['base', 'home', 'field']),
  F('shakshuka', 'שקשוקה', 'מחבת אישית', 320, 20, 14, 20, 'protein', ['eggs', 'vegetables', 'spicy']),
  F('tuna_can', 'טונה במים', 'קופסה', 120, 26, 0, 1, 'protein', ['tuna', 'fish'], ['base', 'home', 'field']),
  F('salmon', 'סלמון', '150 ג׳', 310, 32, 0, 20, 'protein', ['fish'], ['home']),
  F('loof', 'לוף / שימורי בשר', 'חצי קופסה', 260, 18, 4, 19, 'protein', ['red_meat'], ['field']),
  F('protein_shake', 'שייק חלבון (מים)', 'סקופ', 120, 24, 3, 1.5, 'protein', [], ['base', 'home', 'field']),
  F('cottage', 'קוטג׳ 5%', 'גביע 250 ג׳', 220, 27, 7, 12, 'dairy', ['dairy', 'cottage']),
  F('greek_yogurt', 'יוגורט חלבון', 'גביע', 140, 20, 9, 1.5, 'dairy', ['dairy'], ['base', 'home']),
  F('milky_protein', 'מעדן חלבון', 'גביע', 160, 20, 14, 3, 'dairy', ['dairy'], ['base', 'home']),
  F('yellow_cheese', 'גבינה צהובה', '3 פרוסות', 210, 15, 0, 16, 'dairy', ['dairy']),
  F('lentils', 'מג׳דרה / עדשים', 'כוס', 300, 15, 45, 7, 'carb', ['legumes', 'rice']),
  // פחמימות
  F('rice', 'אורז', 'כוס מבושל', 240, 5, 52, 1, 'carb', ['rice']),
  F('pasta', 'פסטה', 'כוס מבושלת', 220, 8, 43, 1.3, 'carb', ['pasta']),
  F('potatoes', 'תפוחי אדמה אפויים', '2 בינוניים', 260, 6, 58, 0.5, 'carb', []),
  F('sweet_potato', 'בטטה', '1 גדולה', 180, 4, 41, 0.3, 'carb', ['vegetables']),
  F('pita', 'פיתה', '1 יחידה', 250, 9, 50, 1.5, 'carb', ['bread'], ['base', 'home', 'field']),
  F('whole_bread', 'לחם מלא', '2 פרוסות', 180, 8, 32, 2, 'carb', ['bread'], ['base', 'home', 'field']),
  F('oats', 'שיבולת שועל', '60 ג׳', 230, 8, 40, 4, 'carb', ['oats'], ['base', 'home', 'field']),
  F('couscous', 'קוסקוס', 'כוס', 230, 8, 46, 0.5, 'carb', []),
  F('cornflakes', 'דגני בוקר + חלב', 'קערה', 300, 11, 55, 4, 'carb', ['dairy']),
  F('crackers', 'פתיתים / קרקרים מלאים', 'מנה', 200, 5, 38, 3, 'carb', [], ['field', 'base']),
  // שומנים
  F('tahini', 'טחינה', '2 כפות', 180, 5, 3, 16, 'fat', ['tahini']),
  F('hummus', 'חומוס', '4 כפות', 200, 7, 14, 13, 'fat', ['hummus', 'legumes'], ['base', 'home', 'field']),
  F('avocado', 'אבוקדו', 'חצי', 160, 2, 8, 15, 'fat', ['avocado']),
  F('peanut_butter', 'חמאת בוטנים', '2 כפות', 190, 8, 6, 16, 'fat', ['peanut', 'nuts'], ['base', 'home', 'field']),
  F('nuts', 'אגוזים מעורבים', 'חופן (30 ג׳)', 180, 5, 6, 16, 'fat', ['nuts'], ['base', 'home', 'field']),
  F('olive_oil', 'שמן זית (בסלט/בישול)', 'כף', 120, 0, 0, 14, 'fat', []),
  // פירות
  F('banana', 'בננה', '1 יחידה', 105, 1.3, 27, 0.4, 'fruit', ['fruit'], ['base', 'home', 'field']),
  F('apple', 'תפוח', '1 יחידה', 95, 0.5, 25, 0.3, 'fruit', ['fruit'], ['base', 'home', 'field']),
  F('dates', 'תמרים', '4 יחידות', 110, 1, 30, 0, 'fruit', ['fruit'], ['base', 'home', 'field']),
  F('orange', 'תפוז', '1 יחידה', 65, 1.2, 15, 0.2, 'fruit', ['fruit']),
  F('berries_smoothie', 'שייק פירות יער + בננה', 'כוס גדולה', 220, 4, 48, 2, 'fruit', ['fruit']),
  // ירקות
  F('israeli_salad', 'סלט ירקות קצוץ', 'קערה', 60, 2, 10, 0.5, 'veg', ['vegetables']),
  F('cooked_veg', 'ירקות מבושלים/אפויים', 'כוס', 80, 3, 15, 1, 'veg', ['vegetables']),
  F('veg_soup', 'מרק ירקות טחון', 'קערה', 120, 4, 18, 3, 'veg', ['vegetables']),
  // חטיפים
  F('protein_bar', 'חטיף חלבון', '1 יחידה', 200, 20, 20, 7, 'snack', [], ['base', 'home', 'field']),
  F('granola_bar', 'חטיף גרנולה', '1 יחידה', 130, 3, 20, 4, 'snack', ['oats'], ['base', 'home', 'field']),
  F('chocolate_milk', 'שוקו', 'שקית', 190, 8, 30, 4, 'snack', ['dairy'], ['base', 'home', 'field']),
];

export const FOOD = Object.fromEntries(FOODS.map((f) => [f.id, f]));

// מקורות חלופיים לויטמינים/סיבים למי שלא אוכל ירקות
export const NO_VEG_TIPS = [
  { icon: '🍌', title: 'פירות במקום ירקות', text: 'פירות מכסים חלק גדול מהוויטמינים — יעד: 3 פירות ביום (בננה, תפוח, תפוז, תמרים).' },
  { icon: '🥤', title: 'שייק "מוסתר"', text: 'בננה + פירות יער + קצת תרד טחון — הטעם של פירות לגמרי, בלי לראות ירוק.' },
  { icon: '🍝', title: 'רוטב עגבניות', text: 'רוטב עגבניות חלק לפסטה/שקשוקה נחשב ירק — ליקופן וויטמינים בלי מרקם של ירק.' },
  { icon: '🌾', title: 'סיבים מדגנים', text: 'שיבולת שועל, לחם מלא, עדשים ותפוחי אדמה עם קליפה — לסיבים ולעיכול תקין.' },
  { icon: '🍲', title: 'מרק טחון', text: 'מרק ירקות טחון חלק נשמע כמו מרק, לא כמו סלט. שווה ניסיון בשישי בבית.' },
  { icon: '💊', title: 'מולטי-ויטמין', text: 'כשאין ירקות בתפריט, כדאי להתייעץ עם רופא היחידה/דיאטנית לגבי תוסף מולטי-ויטמין.' },
];

export const ARMY_TIPS = [
  { icon: '🍽️', title: 'בחדר האוכל', text: 'צלחת לוחם: חצי צלחת חלבון (עוף/ביצים/קציצות), רבע פחמימה (אורז/פסטה/תפו״א), תוספת שומן טוב (טחינה/חומוס).' },
  { icon: '🎒', title: 'בשטח', text: 'טונה, לוף, פיתות, חמאת בוטנים, תמרים וחטיפי חלבון — שומרים על חלבון גם בשבוע שטח.' },
  { icon: '💧', title: 'שתייה', text: 'בשטח ובחום — לשתות לפני שצמאים. שתן בהיר = שתייה מספקת.' },
  { icon: '⏰', title: 'אחרי אימון', text: 'בתוך שעה: 25–40 גרם חלבון + פחמימה. שוקו + טונה בפיתה עובד מצוין.' },
  { icon: '😴', title: 'שינה = שריר', text: 'כל שעת שינה נוספת שווה יותר מכל תוסף. להשלים מנוחה כשאפשר.' },
];
