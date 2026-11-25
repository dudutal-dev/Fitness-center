// תיקוני מסכים מהבדיקה המקיפה (25.11.2026): כותרת הבית ולשוניות מסך ההתקדמות
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const css = read('css/app.css');
const rule = (sel) => { const i = css.indexOf(`\n${sel} {`); assert.ok(i >= 0, `אין כלל ${sel}`); return css.slice(i, css.indexOf('}', i)); };

test('כותרת הבית: תיבת הכפתורים לא מתכווצת, ושורת המסלול סופגת את החוסר', () => {
  assert.match(rule('.top-actions'), /flex: 0 0 auto/);
  assert.doesNotMatch(rule('.top-actions'), /flex-shrink: 1|min-width: 0/);
  assert.match(rule('.hello'), /flex: 1 1 0; min-width: 0/);
});

test('לשוניות מסך ההתקדמות לא נחתכות, ושאר ה-.seg לא השתנו', () => {
  assert.match(css, /\.seg:not\(\.tabs\):has\(> \[data-tab\]\) button \{[^}]*min-width: max-content/);
  assert.match(rule('.seg button'), /flex: 1 1 0; min-width: 0;/);
  assert.match(read('js/views/progress.js'), /<div class="seg" style="margin-bottom:14px">\$\{tabs\.map\(\(\[k, t\]\) => `<button data-tab=/);   // הכלל נשען על המבנה הזה
});
