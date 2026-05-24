import { expeditions } from '../data/expeditions.js';
import { archiveItems } from '../data/archive.js';
import { mountReactMap } from '../map/reactMap.jsx';
import { goTo } from './screens.js';
import { openLightbox } from './archive.js';
import { h, formatDate } from '../util/dom.js';

let currentExp = null;
let selectedEventIndex = 0;
let mapEl = null;
let shipPlanOverlay = null;
let mapComparisonOverlay = null;
let logisticsPanel = null;

export function mount({ expeditionId } = {}) {
  const exp = expeditions.find(e => e.id === expeditionId) || expeditions[0];
  currentExp = exp;
  selectedEventIndex = 0;

  const screen = document.getElementById('screen-expedition');
  screen.innerHTML = '';

  const layout = h('div', { class: 'layout-split' });

  // Left: map
  mapEl = h('div', { class: 'layout-split__map' });

  // Right: data column
  const dataCol = h('div', { class: 'layout-split__data' });
  buildDataColumn(dataCol, exp);

  layout.appendChild(mapEl);
  layout.appendChild(dataCol);
  screen.appendChild(layout);

  // Overlays mount on body so position:fixed works outside the UI layer stacking context
  removeOverlays();
  buildShipPlanOverlay(exp);
  buildMapComparisonOverlay(exp);
  buildLogisticsPanel(exp);

  // Mount React Leaflet map containing route and logic
  mountReactMap(mapEl, exp, (wp) => {
    // Log or handle waypoint tap interactions here
  });

  // Draw route after a frame
  requestAnimationFrame(() => {
    if (typeof drawTemperatureGraph === 'function') drawTemperatureGraph(exp);
  });
}

export function unmount() {
  removeOverlays();
}

function removeOverlays() {
  [shipPlanOverlay, mapComparisonOverlay, logisticsPanel].forEach(el => {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  });
  shipPlanOverlay = mapComparisonOverlay = logisticsPanel = null;
}

function buildDataColumn(col, exp) {
  // Stats
  const statsGrid = h('div', { class: 'expedition-stats' });

  const statItems = [
    { number: exp.stats.distanceKm, label: 'km afstand' },
    { number: exp.stats.durationDays, label: 'dagen onderweg' },
    { number: exp.stats.lowestTempC + '°C', label: 'laagste temperatuur' },
    { number: exp.stats.crewCount, label: 'bemanningsleden' },
  ];

  for (const s of statItems) {
    const block = h('div', { class: 'stat-block' },
      h('div', { class: 'stat-block__number' }, String(s.number)),
      h('div', { class: 'stat-block__label' }, s.label)
    );
    statsGrid.appendChild(block);
  }
  col.appendChild(statsGrid);

  // Temperature graph placeholder (filled by drawTemperatureGraph)
  const graphWrap = h('div', { class: 'temp-graph', id: 'temp-graph-wrap' });
  col.appendChild(graphWrap);

  // Timeline ribbon
  const ribbonLabel = h('div', { class: 't-label', style: 'margin-top: 1.5rem; margin-bottom: 0.5rem;' }, 'Tijdlijn');
  col.appendChild(ribbonLabel);

  const ribbon = buildTimelineRibbon(exp);
  col.appendChild(ribbon);

  // Event detail
  const eventDetail = h('div', { class: 'event-card', id: 'event-detail' });
  col.appendChild(eventDetail);
  updateEventDetail(eventDetail, exp.timeline[0]);

  // Footer navigation
  const footerNav = h('div', { class: 'footer-nav' });

  if (exp.crew && exp.crew.length) {
    const bemanning = h('div', { class: 'footer-nav__item' }, 'Bemanning');
    bemanning.addEventListener('pointerdown', () => {
      if (exp.crew[0]) goTo('person', { personId: exp.crew[0] });
    });
    footerNav.appendChild(bemanning);
  }

  const schip = h('div', { class: 'footer-nav__item' }, 'Schip');
  schip.addEventListener('pointerdown', () => {
    if (shipPlanOverlay) shipPlanOverlay.classList.add('is-open');
  });
  footerNav.appendChild(schip);

  if (exp.maps && exp.maps.length) {
    const kaarten = h('div', { class: 'footer-nav__item' }, 'Kaarten');
    kaarten.addEventListener('pointerdown', () => {
      if (mapComparisonOverlay) mapComparisonOverlay.classList.add('is-open');
    });
    footerNav.appendChild(kaarten);
  }

  const archief = h('div', { class: 'footer-nav__item' }, 'Archief');
  archief.addEventListener('pointerdown', () => {
    goTo('archive', { filterExpedition: exp.id });
  });
  footerNav.appendChild(archief);

  const logistiek = h('div', { class: 'footer-nav__item' }, 'Logistiek');
  logistiek.addEventListener('pointerdown', () => {
    if (logisticsPanel) logisticsPanel.classList.toggle('is-open');
  });
  footerNav.appendChild(logistiek);

  col.appendChild(footerNav);
}

function buildTimelineRibbon(exp) {
  const ribbon = h('div', { class: 'timeline-ribbon' });
  const track = h('div', { class: 'timeline-ribbon__track' });
  ribbon.appendChild(track);

  const events = exp.timeline;
  if (!events.length) return ribbon;

  const firstDate = new Date(events[0].date).getTime();
  const lastDate  = new Date(events[events.length - 1].date).getTime();
  const span = lastDate - firstDate || 1;

  events.forEach((evt, i) => {
    const pct = (new Date(evt.date).getTime() - firstDate) / span;
    const evtEl = h('div', { class: `timeline-ribbon__event${i === 0 ? ' is-active' : ''}` });
    evtEl.style.left = `${pct * 100}%`;
    const dot = h('div', { class: 'timeline-ribbon__dot' });
    evtEl.appendChild(dot);

    evtEl.addEventListener('pointerdown', () => {
      // Deactivate all, activate this
      ribbon.querySelectorAll('.timeline-ribbon__event').forEach(el => el.classList.remove('is-active'));
      evtEl.classList.add('is-active');
      selectedEventIndex = i;

      const detail = document.getElementById('event-detail');
      if (detail) updateEventDetail(detail, evt);
    });

    ribbon.appendChild(evtEl);
  });

  // Scrub line marker at first event
  const marker = h('div', { class: 'timeline-ribbon__marker' });
  marker.style.left = '0%';
  ribbon.appendChild(marker);

  // Drag scrub
  let dragging = false;
  ribbon.addEventListener('pointerdown', e => { dragging = true; scrub(e, ribbon, events, firstDate, span); });
  ribbon.addEventListener('pointermove', e => { if (dragging) scrub(e, ribbon, events, firstDate, span); });
  ribbon.addEventListener('pointerup', () => { dragging = false; });

  return ribbon;
}

function scrub(e, ribbon, events, firstDate, span) {
  const rect = ribbon.getBoundingClientRect();
  const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const targetDate = firstDate + pct * span;

  // Find nearest event
  let nearest = 0;
  let nearestDist = Infinity;
  events.forEach((evt, i) => {
    const d = Math.abs(new Date(evt.date).getTime() - targetDate);
    if (d < nearestDist) { nearestDist = d; nearest = i; }
  });

  ribbon.querySelectorAll('.timeline-ribbon__event').forEach((el, i) => {
    el.classList.toggle('is-active', i === nearest);
  });

  const detail = document.getElementById('event-detail');
  if (detail) updateEventDetail(detail, events[nearest]);

  // Move marker
  const evtPct = (new Date(events[nearest].date).getTime() - firstDate) / span;
  const marker = ribbon.querySelector('.timeline-ribbon__marker');
  if (marker) marker.style.left = `${evtPct * 100}%`;
}

function updateEventDetail(el, evt) {
  if (!evt) return;
  el.innerHTML = '';
  el.appendChild(h('div', { class: 'event-card__date' }, formatDate(evt.date)));
  el.appendChild(h('div', { class: 'event-card__title' }, evt.title));
  el.appendChild(h('div', { class: 'event-card__body' }, evt.body));

  if (evt.images && evt.images.length) {
    const imgStrip = h('div', { class: 'event-card__images' });
    evt.images.forEach(src => {
      const thumb = h('div', { class: 'event-card__thumb' });
      const img = h('img', { src, alt: '' });
      thumb.appendChild(img);
      thumb.addEventListener('pointerdown', () => {
        const item = archiveItems.find(a => a.file === src)
          || { file: src, title: '', date: '', location: '', source: '' };
        openLightbox(item);
      });
      imgStrip.appendChild(thumb);
    });
    el.appendChild(imgStrip);
  }
}

function buildShipPlanOverlay(exp) {
  const overlay = h('div', { class: 'ship-plan-overlay' });

  const close = h('div', { class: 'modal-close', style: 'position:absolute;top:1rem;right:1rem;' }, '×');
  close.addEventListener('pointerdown', () => overlay.classList.remove('is-open'));
  overlay.appendChild(close);

  overlay.appendChild(h('img', { src: 'img/5603_scheepsplan.jpg', alt: 'Scheepsplan Belgica' }));
  overlay.appendChild(h('div', { class: 't-label', style: 'text-align:center;margin-top:1rem;' }, 'Scheepsplan S.Y. Belgica'));

  document.body.appendChild(overlay);
  shipPlanOverlay = overlay;
}

function buildMapComparisonOverlay(exp) {
  if (!exp.maps || !exp.maps.length) return;

  const overlay = h('div', { class: 'map-comparison' });

  const close = h('div', { class: 'map-comparison__close' }, '×');
  close.addEventListener('pointerdown', () => overlay.classList.remove('is-open'));
  overlay.appendChild(close);

  overlay.appendChild(h('div', { class: 't-label', style: 'position:absolute;top:72px;left:2.5rem;' }, 'Historische kaarten · Lecointe 1903'));

  const map1 = exp.maps[0], map2 = exp.maps[1] || exp.maps[0];
  const p1 = h('div', { class: 'map-comparison__panel' });
  p1.appendChild(h('img', { src: map1, alt: 'Kaart 1' }));
  const p2 = h('div', { class: 'map-comparison__panel' });
  p2.appendChild(h('img', { src: map2, alt: 'Kaart 2' }));
  overlay.appendChild(p1);
  overlay.appendChild(p2);

  document.body.appendChild(overlay);
  mapComparisonOverlay = overlay;
}

function buildLogisticsPanel(exp) {
  const panel = h('div', {
    class: 'ship-plan-overlay',
    style: 'padding:4rem 6rem;align-items:flex-start;flex-direction:column;',
  });

  const close = h('div', { class: 'modal-close', style: 'position:absolute;top:1rem;right:1rem;' }, '×');
  close.addEventListener('pointerdown', () => panel.classList.remove('is-open'));
  panel.appendChild(close);

  panel.appendChild(h('div', { class: 't-label', style: 'margin-bottom:2rem;' }, 'Logistiek'));

  const items = [
    ['Proviand', exp.logistics.provisions],
    ['Slee­honden', exp.logistics.sledDogs],
    ['Wetenschappelijke instrumenten', exp.logistics.scientificInstruments],
    ['Boeken in de scheepsbiblio­theek', exp.logistics.libraryBooks],
  ];

  for (const [label, value] of items) {
    const row = h('div', { style: 'margin-bottom:1.5rem;' },
      h('div', { class: 'stat-block__number', style: 'font-size:3rem;' }, String(value)),
      h('div', { class: 'stat-block__label' }, label)
    );
    panel.appendChild(row);
  }

  document.body.appendChild(panel);
  logisticsPanel = panel;
}

function drawTemperatureGraph(exp) {
  const wrap = document.getElementById('temp-graph-wrap');
  if (!wrap || !exp.temperatureData || !exp.temperatureData.length) return;

  const svgNS = 'http://www.w3.org/2000/svg';
  wrap.innerHTML = '';

  const data = exp.temperatureData;
  const W = 400, H = 70;
  const minTemp = Math.min(...data.map(d => d.avgC)) - 5;
  const maxTemp = Math.max(...data.map(d => d.avgC)) + 5;
  const tempRange = maxTemp - minTemp;

  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', H);
  svg.style.display = 'block';
  svg.style.overflow = 'visible';

  // Baseline at 0°C
  const zeroY = H - ((0 - minTemp) / tempRange) * H;
  const baseline = document.createElementNS(svgNS, 'line');
  baseline.setAttribute('x1', 0); baseline.setAttribute('y1', zeroY);
  baseline.setAttribute('x2', W); baseline.setAttribute('y2', zeroY);
  baseline.setAttribute('stroke', 'rgba(74,144,184,0.2)');
  baseline.setAttribute('stroke-width', '0.5');
  baseline.setAttribute('stroke-dasharray', '2 4');
  svg.appendChild(baseline);

  // 0°C label
  const zLabel = document.createElementNS(svgNS, 'text');
  zLabel.setAttribute('x', W - 2); zLabel.setAttribute('y', zeroY - 2);
  zLabel.setAttribute('text-anchor', 'end');
  zLabel.setAttribute('fill', 'rgba(74,144,184,0.4)');
  zLabel.setAttribute('font-family', 'Courier New, monospace');
  zLabel.setAttribute('font-size', '8');
  zLabel.textContent = '0°C';
  svg.appendChild(zLabel);

  // Temperature path
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - ((d.avgC - minTemp) / tempRange) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const pathLen = data.reduce((acc, _, i) => {
    if (i === 0) return 0;
    const dx = W / (data.length - 1);
    const prev = data[i - 1];
    const curr = data[i];
    const dy = ((curr.avgC - prev.avgC) / tempRange) * H;
    return acc + Math.sqrt(dx * dx + dy * dy);
  }, 0) + W;

  const path = document.createElementNS(svgNS, 'polyline');
  path.setAttribute('points', pts.join(' '));
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#7EB8D4');
  path.setAttribute('stroke-width', '1.5');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('class', 'temp-path');
  path.style.strokeDasharray = `${pathLen}`;
  path.style.strokeDashoffset = `${pathLen}`;
  svg.appendChild(path);

  // Label
  const label = document.createElementNS(svgNS, 'text');
  label.setAttribute('x', 0); label.setAttribute('y', H - 2);
  label.setAttribute('fill', 'rgba(126,184,212,0.5)');
  label.setAttribute('font-family', 'Courier New, monospace');
  label.setAttribute('font-size', '8');
  label.setAttribute('letter-spacing', '1');
  label.textContent = 'TEMPERATUUR °C';
  svg.appendChild(label);

  // Month labels
  data.forEach((d, i) => {
    if (i % 2 !== 0) return;
    const x = (i / (data.length - 1)) * W;
    const mlabel = document.createElementNS(svgNS, 'text');
    mlabel.setAttribute('x', x);
    mlabel.setAttribute('y', 10);
    mlabel.setAttribute('text-anchor', 'middle');
    mlabel.setAttribute('fill', 'rgba(74,144,184,0.4)');
    mlabel.setAttribute('font-family', 'Courier New, monospace');
    mlabel.setAttribute('font-size', '7');
    mlabel.textContent = d.month.slice(5); // MM only
    svg.appendChild(mlabel);
  });

  wrap.appendChild(svg);

  // Animate draw-on synchronized with route (1800ms)
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      path.style.transition = `stroke-dashoffset 1800ms linear`;
      path.style.strokeDashoffset = '0';
    });
  });
}
