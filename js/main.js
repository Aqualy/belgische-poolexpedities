import { initIceCanvas } from './ice/iceCanvas.js';
import { preloadFloatImages } from './ice/floatingIce.js';
import { initPointer } from './input/pointer.js';
import { startIdleTimer } from './input/idleTimer.js';
import { registerScreen, goTo, navigateTo, registerCloseLightbox } from './ui/screens.js';
import { initWayfinding, updateBreadcrumb } from './ui/wayfinding.js';
import { initSearch, openSearch } from './ui/search.js';
import { subscribe } from './state.js';
import { expeditions } from './data/expeditions.js';
import { people } from './data/people.js';
import { archiveItems } from './data/archive.js';
import { closeLightbox } from './ui/archive.js';

// Screen modules
import * as attractScreen    from './ui/attract.js';
import * as overviewScreen   from './ui/overview.js';
import * as expeditionScreen from './ui/expedition.js';
import * as timelineScreen   from './ui/timelineGlobal.js';
import * as archiveScreen    from './ui/archive.js';
import * as personScreen     from './ui/person.js';

window.__appData = { expeditions, people };

// ── Safety: always remove preloader after 6s even if something fails ──
setTimeout(() => dismissPreloader(), 6000);

function dismissPreloader() {
  const p = document.getElementById('preloader');
  if (!p) return;
  p.classList.add('is-done');
  setTimeout(() => p?.remove(), 700);
}

async function boot() {
  try {
    // Floating images pre-tinted at load; always resolves
    await preloadFloatImages();
  } catch (err) {
    console.warn('preloadFloatImages failed, continuing:', err);
  }

  // Background preload (non-blocking)
  archiveItems.forEach(item => { const img = new Image(); img.src = item.file; });

  initIceCanvas();
  initPointer();

  registerScreen('attract',    attractScreen);
  registerScreen('overview',   overviewScreen);
  registerScreen('expedition', expeditionScreen);
  registerScreen('timeline',   timelineScreen);
  registerScreen('archive',    archiveScreen);
  registerScreen('person',     personScreen);

  initWayfinding();
  initSearch();
  // Wire closeLightbox into the transition system
  registerCloseLightbox(closeLightbox);
  subscribe(() => updateBreadcrumb());

  startIdleTimer(() => goTo('attract', {}, 'dissolve'));

  wireNavBar();
  dismissPreloader();
  goTo('attract', {}, 'crossfade');
}

function wireNavBar() {
  const navBar = document.getElementById('nav-bar');
  if (!navBar) return;

  navBar.querySelectorAll('.t-nav[data-screen]').forEach(link => {
    link.addEventListener('pointerdown', () => navigateTo(link.dataset.screen, {}));
  });

  const searchLink = navBar.querySelector('[data-action="search"]');
  if (searchLink) searchLink.addEventListener('pointerdown', () => openSearch());
}

boot().catch(err => {
  console.error('Boot failed:', err);
  dismissPreloader(); // always remove preloader even if boot crashes
});
