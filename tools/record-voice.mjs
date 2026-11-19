#!/usr/bin/env node
// Records the game's fixed phrases, plus the word lists in RECORDED_LISTS,
// with ElevenLabs into audio/<voice>/ and updates audio/<voice>/manifest.json.
//
// Only phrases that are not recorded yet are sent, so running it again is
// cheap. The API key is never written anywhere: either set ELEVENLABS_API_KEY,
// or run it somewhere that adds the xi-api-key header for you.
//
//   node tools/record-voice.mjs            record what's missing
//   node tools/record-voice.mjs --dry-run  only show what would be recorded
//   CHILD_NAME=Amy node tools/record-voice.mjs
//
// Uses curl for the requests so it works behind HTTPS proxies.

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { promisify } from 'node:util';
import { ELEVEN, elevenRequest } from '../js/voice/eleven-config.js';
import { fixedPhrases, recordedWordPhrases } from '../js/voice/phrases.js';

const run = promisify(execFile);
const dryRun = process.argv.includes('--dry-run');
const name = process.env.CHILD_NAME ?? 'Amy';
const dir = new URL(`../audio/${ELEVEN.dir}/`, import.meta.url);
const manifestUrl = new URL('manifest.json', dir);

export function clipFile(text) {
  return createHash('sha1').update(`${ELEVEN.voiceId}|${ELEVEN.modelId}|${ELEVEN.outputFormat}|${text}`).digest('hex').slice(0, 14) + '.mp3';
}

async function loadManifest() {
  try {
    return JSON.parse(await readFile(manifestUrl, 'utf8'));
  } catch {
    return { voice: ELEVEN.voiceName, voiceId: ELEVEN.voiceId, model: ELEVEN.modelId, format: ELEVEN.outputFormat, clips: {} };
  }
}

async function record(text, file) {
  const { url, body } = elevenRequest(text);
  const out = new URL(file, dir);
  const args = ['-sS', '--max-time', '60', '-X', 'POST', url, '-H', 'Content-Type: application/json', '-H', 'Accept: audio/mpeg',
    '-d', JSON.stringify(body), '-o', out.pathname, '-w', '%{http_code}'];
  if (process.env.ELEVENLABS_API_KEY) args.push('-H', `xi-api-key: ${process.env.ELEVENLABS_API_KEY}`);
  for (let attempt = 1; attempt <= 4; attempt++) {
    const { stdout } = await run('curl', args);
    if (stdout === '200') {
      const { size } = await stat(out);
      if (size > 500) return size;
    }
    const detail = await readFile(out, 'utf8').catch(() => '');
    if (stdout === '401' || stdout === '402' || /quota/i.test(detail)) throw new Error(`HTTP ${stdout}: ${detail.slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  throw new Error(`Could not record "${text}"`);
}

const manifest = await loadManifest();
const wanted = [...fixedPhrases(name), ...recordedWordPhrases()];
const missing = wanted.filter((t) => !manifest.clips[t]);
const chars = missing.reduce((n, t) => n + t.length, 0);
console.log(`${wanted.length} phrases wanted, ${missing.length} to record (${chars} characters).`);
if (dryRun) {
  for (const t of missing) console.log('  ' + t);
  process.exit(0);
}
await mkdir(dir, { recursive: true });
let done = 0;
const queue = missing.slice();
async function worker() {
  while (queue.length) {
    const text = queue.shift();
    const file = clipFile(text);
    await record(text, file);
    manifest.clips[text] = file;
    done++;
    if (done % 20 === 0) console.log(`  ${done}/${missing.length}`);
  }
}
try {
  await Promise.all([worker(), worker()]);
} finally {
  const sorted = Object.fromEntries(Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b)));
  manifest.clips = sorted;
  await writeFile(manifestUrl, JSON.stringify(manifest, null, 1) + '\n');
  console.log(`Recorded ${done} phrases. Manifest has ${Object.keys(sorted).length}.`);
}
