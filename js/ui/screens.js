import { getState, updateState, pushHistory, popHistory, clearHistory } from '../state.js';

// Lightbox close — screens.js must not import archive.js (evaluation order issue).
// Instead we keep a reference that archive.js registers at init time.
let _closeLightbox = () => {};
export function registerCloseLightbox(fn) { _closeLightbox = fn; }

const registry = {};
let currentScreen = null;
let transitioning = false;

export function registerScreen(id, module) {
  registry[id] = module;
}

// Standard navigation — pushes current screen to back-stack
export function goTo(screen, params = {}, kind = 'crossfade') {
  if (transitioning) return;
  const state = getState();

  // First boot: attract → attract, just mount without transition
  if (state.screen === screen && state.screen === 'attract') {
    updateState({ screen, params });
    if (registry[screen]?.mount) registry[screen].mount(params);
    currentScreen = screen;
    _syncChrome('attract');
    return;
  }

  if (state.screen !== 'attract') {
    pushHistory(state.screen, state.params);
  }

  _transition(state.screen, screen, params, kind);
}

// Top-level navigation (nav bar) — clears history, no back-stack accumulation
export function navigateTo(screen, params = {}) {
  if (transitioning) return;
  const state = getState();
  if (state.screen === screen) return; // already there
  clearHistory();
  _transition(state.screen, screen, params, 'crossfade');
}

export function goBack() {
  if (transitioning) return;
  const prev = popHistory();
  if (!prev) return;
  const state = getState();
  _transition(state.screen, prev.screen, prev.params, 'crossfade');
}

export function goHome() {
  if (transitioning) return;
  const state = getState();
  if (state.screen === 'overview') return;
  clearHistory();
  _transition(state.screen, 'overview', {}, 'crossfade');
}

function _transition(from, to, params, kind) {
  transitioning = true;
  const dur = kind === 'zoom' ? 500 : kind === 'dissolve' ? 800 : 260;

  const fromEl = document.getElementById(`screen-${from}`);
  const toEl   = document.getElementById(`screen-${to}`);

  // Always close the lightbox before any screen transition
  _closeLightbox();

  // Unmount outgoing screen
  if (currentScreen && registry[from]?.unmount) {
    registry[from].unmount();
  }

  // Mount incoming screen
  updateState({ screen: to, params });
  if (registry[to]?.mount) {
    registry[to].mount(params);
  }

  _syncChrome(to);

  // ── Outgoing ──
  if (fromEl) {
    fromEl.style.cssText += `;opacity:0;transition:opacity ${dur}ms;pointer-events:none;`;
    setTimeout(() => {
      fromEl.classList.remove('is-active');
      // CRITICAL: clear ALL inline styles so CSS takes over cleanly next time
      fromEl.style.opacity       = '';
      fromEl.style.transition    = '';
      fromEl.style.pointerEvents = '';
      fromEl.style.transform     = '';
    }, dur);
  }

  // ── Incoming ──
  if (toEl) {
    // Clear any stale inline styles from a previous time this was the outgoing screen
    toEl.style.pointerEvents = '';
    toEl.style.transform     = '';
    toEl.style.opacity       = '0';
    toEl.style.transition    = 'none';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toEl.classList.add('is-active');
        if (kind === 'zoom') {
          toEl.style.transform = 'scale(0.97)';
          toEl.style.transition = `opacity ${dur}ms, transform ${dur}ms`;
        } else {
          toEl.style.transition = `opacity ${dur}ms`;
        }
        toEl.style.opacity   = '1';
        toEl.style.transform = '';
      });
    });
  }

  currentScreen = to;

  setTimeout(() => {
    transitioning = false;
    if (toEl) {
      // Final cleanup — let CSS own everything
      toEl.style.opacity       = '';
      toEl.style.transition    = '';
      toEl.style.transform     = '';
      toEl.style.pointerEvents = '';
    }
  }, dur + 120);
}

function _syncChrome(screen) {
  const navBar     = document.getElementById('nav-bar');
  const breadcrumb = document.getElementById('breadcrumb');
  const iceCanvas  = document.getElementById('ice-canvas');

  if (navBar)     navBar.classList.toggle('is-visible', screen !== 'attract');
  if (breadcrumb) breadcrumb.classList.toggle('is-visible', screen !== 'attract' && screen !== 'overview');
  if (iceCanvas)  iceCanvas.classList.toggle('is-attract', screen === 'attract');
}
