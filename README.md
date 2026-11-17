# LOHEM — מאמן אישי וירטואלי 🪖⚡

אפליקציית אימונים אדפטיבית (PWA) עם מאמן אישי וירטואלי בעברית: תוכנית שמשתנה לפי ההתקדמות, ספירת חזרות וטמפו בקול, הדמיית וידאו לכל תרגיל, ריצה, תזונה שמכבדת "לא אוכל", ומעקב מדדים.

📄 **אפיון מלא:** [docs/SPEC.md](docs/SPEC.md)

## הפעלה מקומית
```bash
npm start            # שרת סטטי על http://localhost:8080
npm test             # בדיקות יחידה למנועים
```
אין תלויות ואין build. כל תיקייה סטטית (GitHub Pages / Cloudflare Pages / Netlify) מתאימה לאירוח.
בטלפון: לפתוח את הכתובת → "הוספה למסך הבית" → נפתחת כמו אפליקציה, עובדת גם בלי קליטה.

## יצירת הנכסים מחדש (ElevenLabs)
```bash
python3 tools/gen_coaches.py                      # דיוקנאות המאמנים
python3 tools/gen_demos.py [exercise_id ...]      # פריים + וידאו 4 שנ׳ לכל תרגיל ולכל מאמן (ממשיך מאיפה שעצר)
python3 tools/build_assets.py                     # כיווץ לווב (mp4 540p, webp, אייקונים)
NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs     # 232 קבצי קול (eleven_v3, עברית)
```
מפתח: משתנה סביבה `XI_API_KEY`.

## מבנה
```
index.html · manifest.webmanifest · sw.js
css/app.css                  מערכת עיצוב
js/app.js                    ניתוב וניווט
js/store.js                  מצב + שמירה אוטומטית
js/engine/                   program · progression · running · nutrition · stats
js/data/                     exercises · foods · voice-lines · coaches
js/views/                    onboarding · home · plan · workout · run · progress · nutrition · coach
js/coach/voice.js            תור השמעת המאמן
assets/                      coaches · demos/{ori,noa} · voice/{ori,noa} · icons
tools/                       סקריפטי יצירת נכסים
tests/                       בדיקות
```
