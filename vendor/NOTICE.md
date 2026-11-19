# Third-party files in `vendor/`

These files run the natural (Piper) voice inside the browser.

## onnxruntime-web 1.31.1 (`vendor/ort/`)

* Source: https://github.com/microsoft/onnxruntime (npm package `onnxruntime-web`)
* Files: `ort.wasm.min.mjs`, `ort-wasm-simd-threaded.mjs`, `ort-wasm-simd-threaded.wasm` (unmodified)
* License: MIT

```
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## piper-phonemize + espeak-ng, WebAssembly build (`vendor/piper/`)

* From the npm package `@diffusionstudio/piper-wasm` 1.0.0 (MIT),
  built from https://github.com/rhasspy/piper-phonemize and
  https://github.com/rhasspy/espeak-ng (see https://github.com/wide-video/piper-wasm for build steps).
* espeak-ng and its data are licensed under the **GNU General Public License v3.0 or later**
  (https://github.com/espeak-ng/espeak-ng/blob/master/COPYING). The corresponding source code
  is available at the links above.
* Changes made here: `piper_phonemize.js` is wrapped as an ES module (`piper_phonemize.mjs`),
  and the data package was trimmed to English only (other languages' `*_dict` files removed;
  the file table in the loader was updated to match). `piper_phonemize.wasm` is unmodified.

## Recorded voice clips (`audio/alice/`)

Spoken by "Alice", an ElevenLabs voice, generated with ElevenLabs text to speech
(https://elevenlabs.io) using the project owner's account.

## Piper voices (downloaded at run time, not stored in this repository)

From https://huggingface.co/rhasspy/piper-voices (pinned to commit `42301ec5`):

* **Cori** (`en_GB-cori-medium`, the default): the voice of Cori Samuel, a LibriVox volunteer reader,
  from the Hi-Fi Multi-Speaker English TTS dataset (NVIDIA), CC BY 4.0. Thank you, Cori.
* **Jenny** (`en_GB-jenny_dioco-medium`): Jenny TTS dataset by Dioco, see https://github.com/dioco-group/jenny-tts-dataset for its licence.
* **Alba** (`en_GB-alba-medium`): University of Edinburgh dataset, CC BY 4.0.
* **Southern** (`en_GB-southern_english_female-low`): OpenSLR 83, CC BY-SA 4.0.
