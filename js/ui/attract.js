import { buildFrozenTexture } from '../ice/frozenSurface.js';
import { initFloes, startFloating, stopFloating, hitTestFloe, toggleFloeInfo, hideAllFloeInfo } from '../ice/floatingIce.js';
import { breakIce } from '../ice/crackEngine.js';
import { goTo } from './screens.js';

let isBreaking = false;
let downX = 0, downY = 0;
let screenEl = null;

function handlePointerDown(e) {
  downX = e.clientX;
  downY = e.clientY;
}

function handlePointerUp(e) {
  if (isBreaking) return;
  const dx = e.clientX - downX;
  const dy = e.clientY - downY;
  if (Math.sqrt(dx * dx + dy * dy) > 12) return;

  const x = e.clientX;
  const y = e.clientY;

  const floeIdx = hitTestFloe(x, y);
  if (floeIdx !== -1) {
    toggleFloeInfo(floeIdx);
    return;
  }

  // Tap on empty area → break ice and go to overview
  isBreaking = true;
  stopFloating();
  breakIce(x, y, () => {
    goTo('overview', {}, 'crossfade');
  });
}

export function mount() {
  isBreaking = false;

  const canvas = document.getElementById('ice-canvas');
  canvas.classList.add('is-attract');

  // Ensure frozen texture is built
  buildFrozenTexture();

  // Init and start floating images
  initFloes();
  startFloating();

  // Listen on the screen element — it sits on top of the canvas and captures events
  screenEl = document.getElementById('screen-attract');
  screenEl.addEventListener('pointerdown', handlePointerDown);
  screenEl.addEventListener('pointerup', handlePointerUp);
}

export function unmount() {
  stopFloating();
  hideAllFloeInfo();

  if (screenEl) {
    screenEl.removeEventListener('pointerdown', handlePointerDown);
    screenEl.removeEventListener('pointerup', handlePointerUp);
    screenEl = null;
  }

  const canvas = document.getElementById('ice-canvas');
  canvas.classList.remove('is-attract');
}
