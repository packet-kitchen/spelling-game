import { register, go } from './router.js';
import { state } from './state.js';
import { startScreen, homeScreen } from './screens/home.js';
import { missionScreen } from './screens/mission.js';
import { testScreen } from './screens/test.js';
import { stableScreen, giftScreen } from './screens/stable.js';
import { parentGate, parentHome, listEditor } from './screens/parent.js';
import * as voice from './voice/neural.js';
import * as eleven from './voice/eleven.js';
import { prepare } from './speech.js';
import { fixedPhrases, entryPhrases } from './voice/phrases.js';
import { focusEntries } from './state.js';

register('start', startScreen);
register('home', homeScreen);
register('mission', missionScreen);
register('test', testScreen);
register('stable', stableScreen);
register('gift', giftScreen);
register('parent', parentGate);
register('parentHome', parentHome);
register('listEditor', listEditor);

document.body.classList.toggle('calm', !!state.settings.calm);
go('start');

// Natural voice: start getting it ready straight away (downloads once, in the
// background; the Chromebook voice is used until it is ready).
voice.onVoiceStatus((s) => {
  if (s.status === 'ready') {
    voice.prefetch(fixedPhrases(state.settings.childName), 'later');
    voice.prefetch(entryPhrases(focusEntries()), 'later');
  }
});
if (voice.wanted()) voice.ensureLoaded();
else voice.settingsChanged();

// ElevenLabs voice: recorded phrases are ready at once; with a key, anything
// still missing (a new name, this week's words) is made in the background.
if (eleven.wanted()) {
  eleven.loadManifest().then(() => prepare([...fixedPhrases(state.settings.childName), ...entryPhrases(focusEntries())]));
}

// Works offline once loaded, and can be installed as an app from Chrome's menu.
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw\b/.test(location.search)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
