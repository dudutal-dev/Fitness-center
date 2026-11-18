# LOHEM — מאמן אישי וירטואלי 🪖⚡

אפליקציית אימונים אדפטיבית (PWA) עם מאמן אישי וירטואלי בעברית: תוכנית שמשתנה לפי ההתקדמות, ספירת חזרות וטמפו בקול, הדמיית וידאו לכל תרגיל, ריצה, תזונה שמכבדת "לא אוכל", ומעקב מדדים.

⌚ **Garmin:** דופק חי ב-Bluetooth (Broadcast HR / HRM-Pro), מרחק וקצב ב-GPS, וייבוא פעילויות מ-Garmin Connect (FIT/TCX/GPX/ZIP).

📄 **אפיון מלא:** [docs/SPEC.md](docs/SPEC.md)

## הפעלה מקומית
```bash
npm start            # שרת סטטי על http://localhost:8080
npm test             # בדיקות יחידה למנועים
```
אין תלויות ואין build. כל תיקייה סטטית (GitHub Pages / Cloudflare Pages / Netlify) מתאימה לאירוח.
בטלפון: לפתוח את הכתובת → "הוספה למסך הבית" → נפתחת כמו אפליקציה, עובדת גם בלי קליטה.

## פרסום
כל push לענף מתפרסם ב-GitHub Pages: https://dudutal-dev.github.io/Fitness-center/
לפני כל commit: `node tools/release.mjs "תיאור"` (הוסף `--media` אם קבצי וידאו/קול השתנו) — כך האפליקציות המותקנות מתעדכנות לבד.

## שרת התזכורות (Cloudflare Worker)
`worker/` — `index.js` (API + קרון), `webpush.js` (הצפנה + VAPID), `schedule.js` (מתי לשלוח). פרוס כ-`lohem-reminders` עם KV `SUBS`, משתנים `VAPID_PUBLIC`, `VAPID_SUBJECT` וסוד `VAPID_PRIVATE_JWK`, וקרון `*/5 * * * *`.

## יצירת הנכסים מחדש (ElevenLabs)
```bash
python3 tools/gen_coaches.py                      # דיוקנאות המאמנים
python3 tools/gen_demos.py [exercise_id ...]      # פריים + וידאו 4 שנ׳ לכל תרגיל ולכל מאמן (ממשיך מאיפה שעצר)
python3 tools/build_assets.py                     # כיווץ לווב (mp4 540p, webp, אייקונים)
python3 tools/analyze_demos.py                    # זיהוי קטעי החזרות בכל וידאו (לסנכרון עם הספירה)
NODE_USE_ENV_PROXY=1 node tools/gen_voice.mjs     # 246 קבצי קול (eleven_v3, עברית, ניקוד למילים קצרות)
python3 tools/verify_voice.py lines.json          # בדיקת הגייה: תמלול חוזר והשוואה
python3 tools/fix_voice.py lines2.json 0.9        # יצירה מחדש של קבצים חלשים (best-of-N)
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
js/devices/                  Garmin: דופק BLE, GPS, מפענח FIT/TCX/GPX/ZIP
assets/                      coaches · demos/{ori,noa} · voice/{ori,noa} · icons · fonts (Heebo, Rubik — OFL)
tools/                       סקריפטי יצירת נכסים
tests/                       בדיקות
```
