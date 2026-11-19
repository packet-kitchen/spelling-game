// Plays one voice clip at a time (a recorded file URL or a Blob).
// Resolves when the clip ends or is stopped; never hangs.

let audio = null;
let finishCurrent = null;
let token = 0;

export function playSource(src, { rate = 1 } = {}) {
  const my = ++token;
  if (finishCurrent) finishCurrent();
  return new Promise((resolve) => {
    if (!audio) audio = new Audio();
    const isBlob = typeof src !== 'string';
    const url = isBlob ? URL.createObjectURL(src) : src;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onloadedmetadata = null;
      if (audio.src === url || audio.src === new URL(url, location.href).href) {
        audio.pause();
        audio.removeAttribute('src');
      }
      if (isBlob) URL.revokeObjectURL(url);
      if (finishCurrent === finish) finishCurrent = null;
      resolve(my === token);
    };
    // Safety net in case "ended" never fires; tightened once the length is known.
    let timer = setTimeout(finish, 20000);
    audio.onloadedmetadata = () => {
      if (Number.isFinite(audio.duration)) {
        clearTimeout(timer);
        timer = setTimeout(finish, (audio.duration / (rate || 1)) * 1000 + 2500);
      }
    };
    finishCurrent = finish;
    audio.onended = finish;
    audio.onerror = finish;
    audio.preservesPitch = true;
    audio.defaultPlaybackRate = rate;
    audio.src = url;
    audio.playbackRate = rate;
    const p = audio.play();
    if (p && p.catch) p.catch(finish);
  });
}

export function stopPlayback() {
  token++;
  if (audio) {
    try { audio.pause(); } catch { /* ignore */ }
  }
  if (finishCurrent) finishCurrent();
}
