import { getState } from '../state.js';
import { goBack, goHome } from './screens.js';

// Minimal wayfinding: ← back + home link only
// No trail text — avoids overflow and visual clutter

export function initWayfinding() {
  const breadcrumb = document.getElementById('breadcrumb');
  if (!breadcrumb) return;

  const backBtn = document.createElement('div');
  backBtn.className = 't-crumb';
  Object.assign(backBtn.style, {
    cursor: 'pointer',
    minWidth: '88px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    fontFamily: '"Courier New", monospace',
    fontSize: '0.875rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(184,212,232,0.55)',
  });
  backBtn.textContent = '← Terug';
  backBtn.addEventListener('pointerdown', goBack);
  breadcrumb.appendChild(backBtn);

  const homeBtn = document.createElement('div');
  homeBtn.className = 't-crumb';
  Object.assign(homeBtn.style, {
    cursor: 'pointer',
    marginLeft: 'auto',
    minWidth: '88px',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    fontFamily: '"Courier New", monospace',
    fontSize: '0.875rem',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'rgba(184,212,232,0.55)',
  });
  homeBtn.textContent = 'Overzicht';
  homeBtn.addEventListener('pointerdown', goHome);
  breadcrumb.appendChild(homeBtn);
}

// No trail update needed — breadcrumb is static
export function updateBreadcrumb() {}
