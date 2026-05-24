import { archiveItems } from '../data/archive.js';
import { h } from '../util/dom.js';

let activeFilters = new Set(['alles']);
let searchQuery   = '';
let currentOriginal = false;

// Lightbox lives on body — persists across remounts
let lightboxOverlay = null;
let lightboxOpenTime = 0; // guard against immediate close from residual pointer events

function ensureLightbox() {
  if (lightboxOverlay && document.body.contains(lightboxOverlay)) return;
  lightboxOverlay = buildLightbox();
  document.body.appendChild(lightboxOverlay);
}

export function mount({ filterExpedition, highlightImage } = {}) {
  const screen = document.getElementById('screen-archive');
  screen.innerHTML = '';

  activeFilters   = filterExpedition ? new Set([filterExpedition]) : new Set(['alles']);
  searchQuery     = '';
  currentOriginal = false;

  const wrap = h('div', { class: 'archive-wrap' });
  screen.appendChild(wrap);

  wrap.appendChild(buildFilterBar());

  const grid = h('div', { class: 'archive-grid', id: 'archive-grid' });
  wrap.appendChild(grid);
  renderGrid(grid);

  ensureLightbox();

  if (highlightImage) {
    const item = archiveItems.find(a => a.file === highlightImage);
    // Longer delay — ensures transition is complete and pointer events have settled
    if (item) setTimeout(() => openLightbox(item), 350);
  }
}

export function unmount() {
  closeLightbox(); // always close on navigation away from archive
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

// ── Filter bar ──

function buildFilterBar() {
  const bar = h('div', { class: 'filter-bar' });

  const filterDefs = [
    { key: 'alles',    label: 'Alles' },
    { key: 'bemanning',label: 'Bemanning' },
    { key: 'schip',    label: 'Schip' },
    { key: 'kaart',    label: 'Kaarten' },
    { key: 'expo',     label: 'Expo' },
    { key: 'belgica',  label: 'Belgica' },
    { key: 'igy',      label: 'IGY' },
    { key: 'belare',   label: 'BELARE' },
  ];

  const filterEls = filterDefs.map(({ key, label }) => {
    const el = h('div', { class: `filter-bar__item${activeFilters.has(key) ? ' is-active' : ''}` }, label);
    el.addEventListener('pointerdown', () => {
      if (key === 'alles') {
        activeFilters = new Set(['alles']);
      } else {
        activeFilters.delete('alles');
        activeFilters.has(key) ? activeFilters.delete(key) : activeFilters.add(key);
        if (activeFilters.size === 0) activeFilters.add('alles');
      }
      filterEls.forEach((el, i) => el.classList.toggle('is-active', activeFilters.has(filterDefs[i].key)));
      const grid = document.getElementById('archive-grid');
      if (grid) renderGrid(grid);
    });
    bar.appendChild(el);
    return el;
  });

  const input = h('input', { class: 'filter-bar__search', placeholder: 'Zoek…', type: 'text' });
  input.addEventListener('input', e => {
    searchQuery = e.target.value.toLowerCase();
    const grid = document.getElementById('archive-grid');
    if (grid) renderGrid(grid);
  });
  bar.appendChild(input);

  return bar;
}

// ── Grid ──

function filterItems() {
  return archiveItems.filter(item => {
    if (searchQuery) {
      const hay = `${item.title} ${item.date} ${item.location} ${item.tags.join(' ')}`.toLowerCase();
      if (!hay.includes(searchQuery)) return false;
    }
    if (activeFilters.has('alles')) return true;
    for (const f of activeFilters) {
      if (['belgica','igy','belare'].includes(f) && item.expeditionIds.includes(f)) return true;
      if (item.tags.includes(f)) return true;
    }
    return false;
  });
}

const imagesState = [];
let animationFrameId = null;
let carouselOffset = 0;
let carouselTotalWidth = 0;

function renderGrid(container) {
  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.flex = '1';
  container.style.overflow = 'hidden';
  container.style.marginTop = '24px';

  const items = filterItems();
  imagesState.length = 0;
  carouselOffset = 0;

  const itemSpacing = 400;
  const cols = Math.ceil(items.length / 2);
  
  // Ensure carouselTotalWidth is a perfect multiple of itemSpacing for seamless looping
  const minWidth = window.innerWidth + itemSpacing * 2;
  carouselTotalWidth = Math.max(minWidth, cols * itemSpacing);
  carouselTotalWidth = Math.ceil(carouselTotalWidth / itemSpacing) * itemSpacing;

  items.forEach((item, i) => {
    const el = document.createElement('div');
    el.style.position = 'absolute';
    
    el.innerHTML = `
      <div style="background: rgba(7,15,28,0.4); padding: 12px; border: 1px solid var(--c-rule); pointer-events: auto;">
        <img src="${item.file}" style="height: 250px; width: 250px; object-fit: contain; cursor: pointer; filter: grayscale(80%) sepia(20%) hue-rotate(185deg); transition: filter 0.3s;" loading="lazy" />
        <div style="text-align: center; color: var(--c-ice-1); margin-top: 12px; font-family: 'Courier New', monospace; font-size: 14px;">${item.title}</div>
      </div>
    `;

    // Hover effect on the image
    const imgEl = el.querySelector('img');
    el.addEventListener('pointerenter', () => { imgEl.style.filter = 'grayscale(0%) sepia(0%) hue-rotate(0deg)'; });
    el.addEventListener('pointerleave', () => { imgEl.style.filter = 'grayscale(80%) sepia(20%) hue-rotate(185deg)'; });

    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      openLightbox(item);
    });

    container.appendChild(el);

    const row = i % 2;
    const col = Math.floor(i / 2);

    imagesState.push({
      el,
      // Stagger the bottom row by half the spacing for a brick-weave pattern
      baseX: col * itemSpacing + (row === 1 ? itemSpacing / 2 : 0),
      row: row,
      angle: i * ((Math.PI * 2) / items.length) + (Math.random() * Math.PI)
    });
  });

  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animateFloatingImages();

  if (!items.length) {
    container.appendChild(h('div', {
      style: 'color:rgba(232,242,248,0.3);font-family:"Courier New",monospace;font-size:0.875rem;padding:2rem 0;letter-spacing:0.1em;text-transform:uppercase; z-index: 10;',
    }, 'Geen resultaten'));
  }
}

function animateFloatingImages() {
  carouselOffset -= 0.4; // Panning speed (reduced from 1.0)
  
  const container = document.getElementById('archive-grid');
  if (!container) return;
  const gridH = container.clientHeight;
  
  // Guarantee exact vertical clearance between the two rows and center them
  const itemHeight = 310; // Approximate height of the image + text box
  const gap = 40;
  const totalContentHeight = (itemHeight * 2) + gap;
  
  const startY = (gridH - totalContentHeight) / 2;
  const centerYTop = startY;
  const centerYBottom = startY + itemHeight + gap;

  imagesState.forEach(state => {
    // Calculate looping X position wrapping safely at the edges
    const x = ((state.baseX + carouselOffset + 600) % carouselTotalWidth + carouselTotalWidth) % carouselTotalWidth - 600;

    // Organic vertical floating calculation
    state.angle += 0.006; // Slower float evolution (reduced from 0.015)
    const baseY = state.row === 0 ? centerYTop : centerYBottom;
    const y = baseY + Math.sin(state.angle) * 25; // Smaller vertical bounce (reduced from 60)

    state.el.style.transform = `translate(${x}px, ${y}px)`;
  });

  animationFrameId = requestAnimationFrame(animateFloatingImages);
}

// ── Lightbox ──

function buildLightbox() {
  const overlay = h('div', {
    // Starts fully hidden — opacity controls show/hide
    style: 'position:fixed;inset:0;z-index:40;pointer-events:none;opacity:0;transition:opacity 280ms;',
  });

  const backdrop = h('div', {
    style: 'position:absolute;inset:0;background:rgba(7,15,28,0.97);display:flex;align-items:center;justify-content:center;flex-direction:column;',
  });

  const closeBtn = h('div', { class: 'modal-close' }, '×');
  closeBtn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    closeLightbox();
  });
  backdrop.appendChild(closeBtn);

  const img = h('img', { style: 'max-width:80%;max-height:70%;object-fit:contain;', alt: '' });
  img.className = 'tinted';
  backdrop.appendChild(img);

  const meta     = h('div', { class: 'modal-meta' });
  const titleEl  = h('div', { class: 't-body', style: 'font-size:1.25rem;margin-bottom:0.5rem;' });
  const dateEl   = h('div', { class: 't-caption' });
  const sourceEl = h('div', { class: 't-caption' });
  const toggleEl = h('div', { class: 't-link', style: 'margin-top:0.75rem;display:inline-block;' }, 'Toon origineel');
  toggleEl.addEventListener('pointerdown', e => {
    e.stopPropagation();
    currentOriginal = !currentOriginal;
    img.classList.toggle('is-original', currentOriginal);
    img.classList.toggle('tinted', !currentOriginal);
    toggleEl.textContent = currentOriginal ? 'Toon gefilterd' : 'Toon origineel';
  });

  meta.appendChild(titleEl);
  meta.appendChild(dateEl);
  meta.appendChild(sourceEl);
  meta.appendChild(toggleEl);
  backdrop.appendChild(meta);
  overlay.appendChild(backdrop);

  // Close on backdrop tap — but guard against residual pointer-up events at open time
  backdrop.addEventListener('pointerdown', e => {
    if (e.target !== backdrop) return;
    const msSinceOpen = Date.now() - lightboxOpenTime;
    if (msSinceOpen < 300) return; // ignore events within 300ms of opening
    closeLightbox();
  });

  overlay._img      = img;
  overlay._titleEl  = titleEl;
  overlay._dateEl   = dateEl;
  overlay._sourceEl = sourceEl;

  return overlay;
}

export function openLightbox(item) {
  ensureLightbox();
  lightboxOpenTime = Date.now();

  lightboxOverlay._img.src              = item.file;
  lightboxOverlay._img.alt              = item.title;
  lightboxOverlay._titleEl.textContent  = item.title;
  lightboxOverlay._dateEl.textContent   = item.date + (item.location ? ' · ' + item.location : '');
  lightboxOverlay._sourceEl.textContent = item.source;

  currentOriginal = false;
  lightboxOverlay._img.classList.add('tinted');
  lightboxOverlay._img.classList.remove('is-original');

  // Show: pointer-events first (so close button works), then opacity (triggers CSS transition)
  lightboxOverlay.style.pointerEvents = 'auto';
  // Use rAF to ensure transition fires
  requestAnimationFrame(() => {
    lightboxOverlay.style.opacity = '1';
  });
}

// Exported so any screen that calls openLightbox can also close it on unmount
export function closeLightbox() {
  if (!lightboxOverlay) return;
  lightboxOverlay.style.opacity       = '0';
  lightboxOverlay.style.pointerEvents = 'none';
}
