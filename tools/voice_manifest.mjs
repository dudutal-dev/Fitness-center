// רשימת כל קבצי הקול: { "<coach>/<key>" | "<coach>/names/<slug>/<key>": { text, spoken } }
import { VOICE_LINES, SPOKEN, FEMALE, NAME_LINES } from '../js/data/voice-lines.js';
import { NAMES } from '../js/data/names.js';
import { WEIGHT_VALUES, WEIGHT_COACHES, weightFile } from '../js/data/weights.js';
import { heKg } from './he_kg.mjs';

export const VOICES = { ori: 'PBHwEnXdzx0yfhIO2UCH' /* Dorian */, noa: 's0T0DT6EAPeX57MQpn3I' /* Danit */ };
const PRONOUN_FIX = { m: [[/גאה בך\./g, 'גאה בְּךָ.']], f: [[/גאה בך\./g, 'גאה בָּךְ.']] };

export function manifest() {
  const out = {};
  for (const coach of Object.keys(VOICES)) {
    const own = (k) => !k.startsWith('hello_') || k === `hello_${coach}`;
    for (const [k, v] of Object.entries(VOICE_LINES)) {
      if (!own(k)) continue;
      const text = typeof v === 'string' ? v : v[coach];
      out[`${coach}/${k}`] = { text, spoken: SPOKEN[k] ?? text };
    }
    for (const [k, text] of Object.entries(FEMALE)) {
      if (!own(k)) continue;
      out[`${coach}/${k}__f`] = { text, spoken: SPOKEN[`${k}__f`] ?? text };
    }
    // המשקלים שמאמני חדר הכושר אומרים: קליפ לכל ערך (js/data/weights.js)
    if (WEIGHT_COACHES.includes(coach)) for (const w of WEIGHT_VALUES) out[`${coach}/kg/${weightFile(w)}`] = { text: `${w} ק״ג`, spoken: heKg(w) };
    for (const n of NAMES) {
      const sx = n.sex === 'f' ? 'f' : 'm';
      for (const [k, v] of Object.entries(NAME_LINES)) {
        const tpl = (v.ori ? v[coach] : v)[sx];
        let spoken = tpl.replaceAll('{name}', n.spoken || n.name);
        for (const [re, rep] of PRONOUN_FIX[sx]) spoken = spoken.replace(re, rep);
        out[`${coach}/names/${n.slug}/${k}`] = { text: tpl.replaceAll('{name}', n.name), spoken };
      }
    }
  }
  return out;
}

if (process.argv[1]?.endsWith('voice_manifest.mjs')) {
  const fs = await import('node:fs');
  const m = manifest();
  fs.writeFileSync(process.argv[2] || 'voice_manifest.json', JSON.stringify(m, null, 1));
  console.log(Object.keys(m).length, 'clips');
}
