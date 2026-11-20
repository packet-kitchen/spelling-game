# 🦄 Unicorn Spelling

A unicorn-themed spelling game for a Year 2 child (age 6–7) in England.
It runs in Chrome on a Chromebook and can be installed as an app. There are
no accounts and no adverts, and progress stays on the device.

* **Talks to the child.** Every word, sentence and instruction is spoken
  aloud, so the child can play on their own.
* **Builds up gently.** Each new word climbs a ladder:
  1. 👀 **Look**: see the word with the tricky bit in pink, then it is covered and the child writes it (*Look, Say, Cover, Write, Check*, as used in school).
  2. 🧩 **Missing letters**: fill in just the tricky bit (`b _ _ ause`).
  3. 🔤 **Letter tiles**: put the letters in order, with a couple of decoys.
  4. 👂 **Listen and spell**: hear the word in a sentence and spell it from memory.
* **Kind feedback.** Mistakes show which letters were right and which need
  another look ("You got 6 out of 7 letters right!"). After two tries the child
  copies the word with help, so every word ends with success.
* **Spaced practice.** Words spelt correctly come back after 1, 3 and 7 days,
  then count as *mastered*. Words on this week's school list come back every day.
* **Unicorn rewards.** Stars fill a rainbow, and stars unlock surprise
  presents with 30 unicorns to collect. Any collected unicorn can be the child's buddy.
* **Practice Test.** This week's list, just like the Friday test at school, with
  corrections at the end and a "practise the tricky ones" button.

## For grown-ups

Open **⚙️ Grown-ups** (bottom right of the home screen). A times-table question
keeps the child out.

### Adding the school's spelling list

1. **Spelling lists → ＋ Add a school list**.
2. Type or paste the words, one per line or separated by commas, then press **Add these words**.
   * Words that are already in the built-in lists get their example sentence and tricky bit filled in automatically.
   * **Tap letters** to mark the tricky part (shown in pink). If you don't, the game guesses (shown dotted).
   * An **example sentence** is optional but helps a lot for sound-alike words (*there/their*, *night/knight*).
   * 🔊 lets you hear how the word and sentence will be read out.
3. Leave **⭐ This is this week's list** ticked and press **Save list**.

This week's words then come first in every Magic Mission, and the **📝 Practice
Test** button appears on the home screen.

### Built-in lists

The game includes the Year 2 *common exception words*, the Year 1 words for
revision, and every Year 2 spelling pattern from the National Curriculum
(English Appendix 1): *dge/ge*, soft *c*, *kn/gn/wr*, *le/el/al/il*, *y → ies/ied*,
dropping *e*, doubling, *al/all*, *o* as in *mother*, *ey*, *wa/qua*, *wor/war*,
*s* as in *treasure*, suffixes, contractions, *tion* and homophones. Switch lists on
or off under **Spelling lists**. Only *Year 2 tricky words* is on to start with.

### Progress

**📈 Progress** shows each word's stage (*Learning → Practising → Mastered*),
the last way it was misspelt, recent test scores and the trickiest words.

### Settings

Child's name, words per mission, voice and speaking speed, sound effects, calm colours, and
**backup/restore**.

> **Important:** progress is stored in Chrome on this Chromebook only. Clearing
> browsing data ("cookies and site data") erases it, so download a backup now and then.

### Voice

The game speaks with **Alice**, a natural British voice from
[ElevenLabs](https://elevenlabs.io).

* **Already recorded:** every instruction, all the praise, the unicorn names and
  the 64 Year 2 tricky words with their sentences are published with the game
  (`audio/alice/`). They play instantly, work offline and need no account.
* **New words** (this week's school list, other lists) are made by ElevenLabs the
  first time they are needed, using **your ElevenLabs API key**:
  **Grown-ups → Settings → Voice → ElevenLabs API key → Save and test.**
  The key is kept only in Chrome on this Chromebook. It is not part of the website
  and not included in backups. Each new word with its sentence uses about 20 credits,
  **once**: it is then saved on the Chromebook. Saving a school list makes its
  words straight away, so they are ready (and work offline) before Amy plays.
* Without a key, anything not recorded is read by the Chromebook's own voice.
* Tip: in ElevenLabs create a key that can only do *Text to Speech*, with a monthly
  credit limit.

Other voices in **Settings → Voice**:

* **Cori:** an offline natural voice made on the Chromebook by
  [Piper](https://github.com/rhasspy/piper). It downloads once (about 63 MB) and
  needs no account.
* **Chromebook voice:** Chrome's built-in voices.

#### Recording more phrases (for developers)

`node tools/record-voice.mjs` records any fixed phrase or pre-recorded word that is
missing from `audio/alice/manifest.json` (use `--dry-run` to see what it would do,
and `CHILD_NAME=…` for name lines). It needs an ElevenLabs key in
`ELEVENLABS_API_KEY`, or a proxy that adds the `xi-api-key` header. `npm test`
fails if a phrase in `js/voice/phrases.js` has not been recorded.

## Putting it on the Chromebook

The game is a plain static website with no build step, so any static web host works.

### Using GitHub Pages

1. Make sure the game's files are on the branch you want to publish (for example, merge into `main`).
2. On GitHub open **Settings → Pages**. Under *Build and deployment* choose **Deploy from a branch**, pick the branch and the **/ (root)** folder, then save.
3. After a minute the site is at `https://<your-username>.github.io/spelling-game/`.

GitHub Pages on a **private** repository needs a paid GitHub plan. The repository
holds no personal data (progress stays on the Chromebook), so making it public is
an option. Netlify or Cloudflare Pages also work.

### Installing it as an app

1. Open the game's address in Chrome on the Chromebook.
2. Open Chrome's **⋮** menu → **Cast, save and share** → **Install page as app…**
   (or the install icon in the address bar; wording varies a little between Chrome versions).
3. Unicorn Spelling then has its own icon in the launcher, opens full screen, and works offline.

## Developing

```bash
npm start      # serves the game at http://localhost:8000
npm test       # unit tests for the spelling logic and word lists (Node 20+)
```

No dependencies are needed; it's vanilla HTML, CSS and JavaScript modules.

```
index.html            page shell
css/styles.css        all styles
js/main.js            registers screens, starts the game, registers the service worker
js/words.js           built-in word lists ('bec[au]se|Sentence.' – [ ] marks the tricky bit)
js/wordutils.js       comparing spellings, tricky-bit guessing, parsing pasted lists
js/scheduler.js       the learning ladder, spaced repetition, choosing mission words
js/state.js           saved data (localStorage), lists, rewards
js/speech.js          text-to-speech
js/voice/phrases.js   everything the game says (the list that gets recorded)
js/voice/eleven.js    Alice (ElevenLabs): recorded clips, new words with the grown-up's key
js/voice/eleven-config.js  voice, model and format used for recordings
js/voice/player.js    plays one clip at a time
tools/record-voice.mjs  records missing phrases into audio/alice/
audio/alice/          recorded clips + manifest.json
js/voice/neural.js    Cori (Piper): download, background generation, saved clips, playback
js/voice/piper-worker.js  the worker that runs Piper (phonemizer + ONNX model)
vendor/               onnxruntime-web and the espeak-ng/piper-phonemize WebAssembly build (see vendor/NOTICE.md)
js/sfx.js             sound effects (Web Audio, no files)
js/unicorns.js        unicorn artwork (SVG) and the collection
js/screens/*.js       home, mission, test, unicorn stable, gift, grown-ups area
sw.js                 offline cache. Bump VERSION when releasing changes
```

The font is [Andika](https://software.sil.org/andika/) by SIL (Open Font
License, see `fonts/OFL-LICENSE.txt`). It is designed for early readers and
uses the single-storey "a" and "g" that children learn to write.

The voice runtime and voices are credited in `vendor/NOTICE.md`. Cori is the voice
of Cori Samuel, a LibriVox volunteer reader (Hi-Fi TTS dataset, CC BY 4.0).
