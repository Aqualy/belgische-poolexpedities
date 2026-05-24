import { goBack } from './screens.js';

export function initWayfinding() {
  const backBtn = document.getElementById('nav-back-btn');
  if (backBtn) backBtn.addEventListener('pointerdown', goBack);
}

export function updateBreadcrumb() {}
