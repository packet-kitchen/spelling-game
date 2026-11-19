import { register, go } from './router.js';
import { state } from './state.js';
import { startScreen, homeScreen } from './screens/home.js';
import { missionScreen } from './screens/mission.js';
import { testScreen } from './screens/test.js';
import { stableScreen, giftScreen } from './screens/stable.js';
import { parentGate, parentHome, listEditor } from './screens/parent.js';

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

// Works offline once loaded, and can be installed as an app from Chrome's menu.
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !/[?&]nosw\b/.test(location.search)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}
