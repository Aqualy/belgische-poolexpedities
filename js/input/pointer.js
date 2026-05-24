import { touchActivity } from '../state.js';

// Unified pointer event management
// Tracks all active pointers for multi-touch support

const activePointers = new Map();
const listeners = { down: [], move: [], up: [] };

let initialized = false;

export function initPointer(target = document) {
  if (initialized) return;
  initialized = true;

  target.addEventListener('pointerdown', onDown, { passive: false });
  target.addEventListener('pointermove', onMove, { passive: false });
  target.addEventListener('pointerup', onUp, { passive: false });
  target.addEventListener('pointercancel', onUp, { passive: false });
}

function onDown(e) {
  e.preventDefault();
  touchActivity();
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, startTime: Date.now() });
  listeners.down.forEach(fn => fn(e, activePointers));
}

function onMove(e) {
  e.preventDefault();
  touchActivity();
  if (activePointers.has(e.pointerId)) {
    activePointers.get(e.pointerId).x = e.clientX;
    activePointers.get(e.pointerId).y = e.clientY;
  }
  listeners.move.forEach(fn => fn(e, activePointers));
}

function onUp(e) {
  e.preventDefault();
  touchActivity();
  const ptr = activePointers.get(e.pointerId);
  if (ptr) {
    const dx = e.clientX - ptr.startX;
    const dy = e.clientY - ptr.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - ptr.startTime;
    // Emit as tap if movement < 12px and duration < 500ms
    if (dist < 12 && duration < 500) {
      listeners.down.forEach(fn => fn({ ...e, type: 'tap', clientX: e.clientX, clientY: e.clientY }, activePointers));
    }
    activePointers.delete(e.pointerId);
  }
  listeners.up.forEach(fn => fn(e, activePointers));
}

export function onPointerDown(fn) { listeners.down.push(fn); return () => remove(listeners.down, fn); }
export function onPointerMove(fn) { listeners.move.push(fn); return () => remove(listeners.move, fn); }
export function onPointerUp(fn)   { listeners.up.push(fn);   return () => remove(listeners.up,   fn); }

export function getPointers() { return activePointers; }

// Hit test — returns true if the point (x, y) is within element's bounding rect
export function hitTest(el, x, y) {
  const r = el.getBoundingClientRect();
  return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
}

function remove(arr, fn) {
  const i = arr.indexOf(fn);
  if (i !== -1) arr.splice(i, 1);
}
