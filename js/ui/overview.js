import { expeditions } from '../data/expeditions.js';
import { goTo } from './screens.js';
import { h } from '../util/dom.js';

let routeAnimFrames = [];

export function mount() {
  const screen = document.getElementById('screen-overview');
  screen.innerHTML = '';

  const grid = h('div', { class: 'layout-3col' });

  expeditions.forEach((exp, i) => {
    const col = buildExpeditionCard(exp, i);
    grid.appendChild(col);
  });

  screen.appendChild(grid);

  // Animate route previews in
  setTimeout(() => animateRoutePreviews(), 400);
}

export function unmount() {
  routeAnimFrames.forEach(id => cancelAnimationFrame(id));
  routeAnimFrames = [];
}

function buildExpeditionCard(exp, index) {
  const col = h('div', { class: 'layout-3col__col' });

  const card = h('div', { class: 'expedition-card' });
  card.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    goTo('expedition', { expeditionId: exp.id }, 'zoom');
  });

  // Year label
  const year = h('div', { class: 'expedition-card__year' },
    `${exp.years.start} — ${exp.years.end}`
  );

  // Hero image
  const imgWrap = h('div', { class: 'expedition-card__image' });
  const img = h('img', { src: exp.cardImage, alt: exp.name });
  img.onerror = () => { imgWrap.style.display = 'none'; };
  imgWrap.appendChild(img);

  // Expedition name
  const name = h('div', { class: 'expedition-card__name' }, exp.name);

  // Leader
  const leader = h('div', { class: 'expedition-card__leader' },
    `${exp.leader}`
  );

  // Description
  const desc = h('div', { class: 'expedition-card__desc' }, exp.subtitle);

  // Pull quote
  const quote = h('div', { class: 't-pullquote', style: 'margin-top: 1.5rem; font-size: 1.25rem;' },
    `"${exp.pullQuote}"`
  );

  // Route preview SVG (minimal animated line)
  const routeWrap = h('div', { class: 'expedition-card__route-preview' });
  const svg = buildRoutePreviewSvg(exp, index);
  routeWrap.appendChild(svg);

  card.appendChild(year);
  card.appendChild(imgWrap);
  card.appendChild(name);
  card.appendChild(leader);
  card.appendChild(desc);
  card.appendChild(quote);
  card.appendChild(routeWrap);

  col.appendChild(card);
  return col;
}

function buildRoutePreviewSvg(exp, index) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('viewBox', '0 0 200 40');
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '40');
  svg.style.display = 'block';

  // Simple horizontal route hint — 4 dots connected by a line
  const line = document.createElementNS(svgNS, 'line');
  line.setAttribute('x1', '10'); line.setAttribute('y1', '20');
  line.setAttribute('x2', '190'); line.setAttribute('y2', '20');
  line.setAttribute('stroke', 'rgba(74,144,184,0.4)');
  line.setAttribute('stroke-width', '0.8');
  svg.appendChild(line);

  // Animated dash line (draws on)
  const track = document.createElementNS(svgNS, 'line');
  track.setAttribute('x1', '10'); track.setAttribute('y1', '20');
  track.setAttribute('x2', '190'); track.setAttribute('y2', '20');
  track.setAttribute('stroke', '#7EB8D4');
  track.setAttribute('stroke-width', '1.2');
  track.setAttribute('stroke-dasharray', '180');
  track.setAttribute('stroke-dashoffset', '180');
  track.setAttribute('data-draw', 'true');
  svg.appendChild(track);

  // Start dot
  const startDot = document.createElementNS(svgNS, 'circle');
  startDot.setAttribute('cx', '10'); startDot.setAttribute('cy', '20'); startDot.setAttribute('r', '3');
  startDot.setAttribute('fill', '#F4F9FC');
  svg.appendChild(startDot);

  // End dot (south)
  const endDot = document.createElementNS(svgNS, 'circle');
  endDot.setAttribute('cx', '190'); endDot.setAttribute('cy', '20'); endDot.setAttribute('r', '3');
  endDot.setAttribute('fill', '#7EB8D4');
  svg.appendChild(endDot);

  // Labels
  const addLabel = (x, text) => {
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', x); t.setAttribute('y', '36');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', 'rgba(74,144,184,0.6)');
    t.setAttribute('font-family', 'Courier New, monospace');
    t.setAttribute('font-size', '7');
    t.setAttribute('letter-spacing', '1');
    t.textContent = text;
    svg.appendChild(t);
  };
  addLabel(10, 'BEL');
  addLabel(190, 'ANT');

  return svg;
}

function animateRoutePreviews() {
  // Use setAttribute (not style) — SVG presentation attributes don't always
  // respond to inline style transitions in all browsers
  const tracks = document.querySelectorAll('#screen-overview [data-draw="true"]');
  tracks.forEach((track, i) => {
    setTimeout(() => {
      // CSS transition via class on the parent SVG or via style — both needed
      track.style.transition = 'stroke-dashoffset 1200ms linear';
      track.style.strokeDashoffset = '0';
      // Fallback: setAttribute for browsers that don't support style on SVG stroke
      track.setAttribute('stroke-dashoffset', '0');
    }, 300 + i * 180);
  });
}
