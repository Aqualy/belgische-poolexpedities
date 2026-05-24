import { getState } from '../state.js';

const IDLE_TIMEOUT = 90_000; // 90 seconds
let checkInterval = null;
let onIdleCallback = null;

export function startIdleTimer(onIdle) {
  onIdleCallback = onIdle;
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(check, 5000);
}

export function stopIdleTimer() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
}

function check() {
  const state = getState();
  if (state.screen === 'attract') return;
  const idle = Date.now() - state.lastInputAt;
  if (idle >= IDLE_TIMEOUT) {
    onIdleCallback?.();
  }
}
