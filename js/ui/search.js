import { archiveItems } from '../data/archive.js';
import { expeditions } from '../data/expeditions.js';
import { people } from '../data/people.js';
import { goTo } from './screens.js';
import { openLightbox } from './archive.js';
import { h } from '../util/dom.js';

let overlay = null;
let searchInput = null;
let resultsGrid = null;
let keyboard = null;

export function initSearch() {
  overlay = h('div', { class: 'search-overlay', id: 'search-overlay' });

  // Close on tap of the overlay background
  overlay.addEventListener('pointerdown', (e) => {
    if (e.target === overlay) closeSearch();
  });

  const inner = h('div', { style: 'position:relative;max-width:1600px;margin:0 auto;' });

  const closeBtn = h('div', {
    class: 'modal-close',
    style: 'position:absolute;top:-40px;right:0;',
  }, '×');
  closeBtn.addEventListener('pointerdown', closeSearch);
  inner.appendChild(closeBtn);

  const fieldWrap = h('div', { class: 'search-field-wrap' });
  // readonly: the on-screen keyboard drives the value. pointer.js preventDefault()
  // suppresses the native keyboard anyway, so the custom keyboard is the only input path.
  searchInput = h('input', { type: 'text', placeholder: 'Zoeken…', readonly: 'readonly' });
  searchInput.addEventListener('input', () => renderResults(searchInput.value));
  // Tapping the search bar brings up the on-screen keyboard.
  searchInput.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    showKeyboard();
  });
  fieldWrap.appendChild(searchInput);
  inner.appendChild(fieldWrap);

  // Filter shortcut chips
  const chips = h('div', { class: 'filter-bar', style: 'border:none;margin-bottom:1.5rem;' });
  ['Bemanning', 'Schip', 'Kaarten', 'Belgica'].forEach(label => {
    const chip = h('div', { class: 'filter-bar__item' }, label);
    chip.addEventListener('pointerdown', () => {
      if (searchInput) {
        searchInput.value = label.toLowerCase();
        renderResults(label.toLowerCase());
      }
    });
    chips.appendChild(chip);
  });
  inner.appendChild(chips);

  resultsGrid = h('div', { class: 'search-results', id: 'search-results' });
  inner.appendChild(resultsGrid);

  overlay.appendChild(inner);

  // On-screen keyboard (fixed to the bottom of the overlay)
  keyboard = buildKeyboard();
  overlay.appendChild(keyboard);

  document.body.appendChild(overlay);

  // The archive "Zoek…" box (and any other caller) opens this overlay via event.
  window.addEventListener('app:open-search', openSearch);
}

export function openSearch() {
  if (!overlay) initSearch();
  overlay.classList.add('is-open');
  if (searchInput) {
    searchInput.value = '';
    renderResults('');
  }
  // Show the keyboard right away so it's clear how to type on the touchwall.
  showKeyboard();
}

export function closeSearch() {
  if (overlay) overlay.classList.remove('is-open');
  hideKeyboard();
}

// ── On-screen keyboard ──

const KEY_ROWS = [
  ['1','2','3','4','5','6','7','8','9','0'],
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l'],
  ['z','x','c','v','b','n','m'],
];

function buildKeyboard() {
  const kb = h('div', { class: 'search-keyboard' });

  KEY_ROWS.forEach(row => {
    const rowEl = h('div', { class: 'search-keyboard__row' });
    row.forEach(key => {
      const keyEl = h('div', { class: 'search-keyboard__key' }, key.toUpperCase());
      keyEl.addEventListener('pointerdown', e => {
        e.stopPropagation();
        typeChar(key);
      });
      rowEl.appendChild(keyEl);
    });
    kb.appendChild(rowEl);
  });

  // Bottom row: space, backspace, close
  const bottom = h('div', { class: 'search-keyboard__row' });

  const spaceKey = h('div', { class: 'search-keyboard__key search-keyboard__key--space' }, 'Spatie');
  spaceKey.addEventListener('pointerdown', e => { e.stopPropagation(); typeChar(' '); });
  bottom.appendChild(spaceKey);

  const backKey = h('div', { class: 'search-keyboard__key search-keyboard__key--wide' }, '⌫');
  backKey.addEventListener('pointerdown', e => { e.stopPropagation(); backspace(); });
  bottom.appendChild(backKey);

  const closeKey = h('div', { class: 'search-keyboard__key search-keyboard__key--wide' }, 'Sluit');
  closeKey.addEventListener('pointerdown', e => { e.stopPropagation(); hideKeyboard(); });
  bottom.appendChild(closeKey);

  kb.appendChild(bottom);
  return kb;
}

function typeChar(ch) {
  if (!searchInput) return;
  searchInput.value += ch;
  renderResults(searchInput.value);
}

function backspace() {
  if (!searchInput) return;
  searchInput.value = searchInput.value.slice(0, -1);
  renderResults(searchInput.value);
}

function showKeyboard() {
  if (keyboard) keyboard.classList.add('is-open');
}

function hideKeyboard() {
  if (keyboard) keyboard.classList.remove('is-open');
}

function renderResults(query) {
  if (!resultsGrid) return;
  resultsGrid.innerHTML = '';
  const q = query.toLowerCase().trim();

  // Archive images
  const matchedItems = archiveItems.filter(item => {
    if (!q) return true;
    return `${item.title} ${item.date} ${item.tags.join(' ')} ${item.expeditionIds.join(' ')}`.toLowerCase().includes(q);
  });

  matchedItems.slice(0, 15).forEach(item => {
    const el = h('div', { class: 'archive-item', style: 'cursor:pointer;' });
    el.appendChild(h('img', { src: item.file, alt: item.title, loading: 'lazy', class: 'tinted' }));
    el.appendChild(h('div', { class: 't-caption', style: 'padding:0.25rem 0;' }, item.title));
    el.addEventListener('pointerdown', () => {
      closeSearch();
      openLightbox(item); // lightbox has its own 300ms guard against accidental immediate close
    });
    resultsGrid.appendChild(el);
  });

  // People
  if (q) {
    Object.entries(people).forEach(([id, person]) => {
      if (!`${person.name} ${person.role}`.toLowerCase().includes(q)) return;
      const el = h('div', { class: 'archive-item', style: 'cursor:pointer;' });
      el.appendChild(h('img', { src: person.portrait, alt: person.name, class: 'tinted' }));
      el.appendChild(h('div', { class: 't-caption', style: 'padding:0.25rem 0;' }, person.name));
      el.addEventListener('pointerdown', () => {
        closeSearch();
        goTo('person', { personId: id });
      });
      resultsGrid.appendChild(el);
    });
  }

  if (!resultsGrid.children.length) {
    resultsGrid.appendChild(h('div', {
      style: 'color:rgba(232,242,248,0.3);font-family:"Courier New",monospace;font-size:0.875rem;padding:1rem 0;letter-spacing:0.1em;text-transform:uppercase;grid-column:1/-1;',
    }, q ? 'Geen resultaten' : 'Begin te typen…'));
  }
}
