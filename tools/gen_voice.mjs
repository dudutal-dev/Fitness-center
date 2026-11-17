// מייצר את כל קבצי הקול של המאמנים ב-ElevenLabs (eleven_v3, עברית).
// הרצה: node tools/gen_voice.mjs   (מדלג על קבצים קיימים)
import { mkdir, writeFile, access } from 'node:fs/promises';
import { VOICE_LINES, SPOKEN } from '../js/data/voice-lines.js';

const VOICES = { ori: 'PBHwEnXdzx0yfhIO2UCH' /* Dorian */, noa: 's0T0DT6EAPeX57MQpn3I' /* Danit */ };
const OUT = new URL('../assets/voice/', import.meta.url);

async function exists(u) { try { await access(u); return true; } catch { return false; } }

async function tts(text, voiceId) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.XI_API_KEY) headers['xi-api-key'] = process.env.XI_API_KEY;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_64`, {
    method: 'POST', headers,
    body: JSON.stringify({ text, model_id: 'eleven_v3', language_code: 'he', voice_settings: { stability: 0.5, similarity_boost: 0.8 } }),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

const jobs = [];
for (const coach of Object.keys(VOICES)) {
  await mkdir(new URL(`${coach}/`, OUT), { recursive: true });
  for (const [key, val] of Object.entries(VOICE_LINES)) {
    if (key.startsWith('hello_') && key !== `hello_${coach}`) continue;
    const text = SPOKEN[key] ?? (typeof val === 'string' ? val : val[coach]);
    jobs.push({ coach, key, text });
  }
}

let i = 0, done = 0;
async function worker() {
  while (i < jobs.length) {
    const j = jobs[i++];
    const file = new URL(`${j.coach}/${j.key}.mp3`, OUT);
    if (await exists(file)) { done++; continue; }
    for (let attempt = 0; attempt < 3; attempt++) {
      try { await writeFile(file, await tts(j.text, VOICES[j.coach])); break; }
      catch (e) { console.error(j.coach, j.key, e.message); await new Promise((r) => setTimeout(r, 2000)); }
    }
    done++;
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
console.log(`voice clips: ${done}/${jobs.length}`);
