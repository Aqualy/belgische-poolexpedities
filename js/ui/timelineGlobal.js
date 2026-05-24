import { expeditions } from '../data/expeditions.js';
import { goTo } from './screens.js';
import { h } from '../util/dom.js';

const C = {
  belgica: { main: '#C8956A', bg: 'rgba(200,149,106,0.13)', dot: '#E8B88A' },
  igy:     { main: '#7EB8D4', bg: 'rgba(126,184,212,0.13)', dot: '#9ECCE0' },
  belare:  { main: '#A8CCAC', bg: 'rgba(168,204,172,0.13)', dot: '#C4DEC8' },
};

const MAJOR_TYPES = new Set(['death', 'trapped', 'freed', 'discovery', 'departure', 'return']);

let detailEl       = null;
let screenTapHndlr = null;

export function mount() {
  const screen = document.getElementById('screen-timeline');
  screen.innerHTML = '';

  const root = h('div', { class: 'tlg-root' });
  screen.appendChild(root);

  const chapters = h('div', { class: 'tlg-chapters' });
  root.appendChild(chapters);
  expeditions.forEach(exp => chapters.appendChild(buildChapter(exp)));

  detailEl = h('div', { class: 'tlg-detail' });
  detailEl.innerHTML = `<div class="tlg-detail__idle">← Selecteer een event op de tijdlijn</div>`;
  root.appendChild(detailEl);

  screenTapHndlr = e => {
    if (detailEl && !detailEl.contains(e.target) && !e.target.closest('.tlg-evt')) {
      clearDetail();
    }
  };
  screen.addEventListener('pointerdown', screenTapHndlr);
}

function buildChapter(exp) {
  const c = C[exp.id];
  const chapter = h('div', { class: `tlg-chapter tlg-chapter--${exp.id}` });

  const head = h('div', { class: 'tlg-chapter__head' });
  head.innerHTML = `
    <div class="tlg-chapter__accent" style="background:${c.main}"></div>
    <div class="tlg-chapter__meta">
      <span class="tlg-chapter__years" style="color:${c.main}">${exp.years.start}–${exp.years.end}</span>
      <span class="tlg-chapter__name" style="color:${c.dot}">${exp.name}</span>
      <span class="tlg-chapter__leader">${exp.leader}</span>
    </div>
  `;
  chapter.appendChild(head);

  const body = h('div', { class: 'tlg-chapter__body' });

  const line = h('div', { class: 'tlg-chapter__line' });
  line.style.borderColor = c.main;
  body.appendChild(line);

  exp.timeline.forEach((evt, i) => {
    const isMajor = i === 0 || i === exp.timeline.length - 1 || MAJOR_TYPES.has(evt.type);

    const evtEl = h('div', { class: `tlg-evt${isMajor ? ' tlg-evt--major' : ''}` });
    evtEl.innerHTML = `
      <span class="tlg-evt__dot" style="border-color:${c.main};${isMajor ? `background:${c.main}` : ''}"></span>
      <div class="tlg-evt__info">
        <span class="tlg-evt__date" style="color:${c.main}">${fmtDate(evt.date)}</span>
        <span class="tlg-evt__title">${evt.title}</span>
      </div>
    `;
    evtEl.addEventListener('pointerdown', e => {
      e.stopPropagation();
      document.querySelectorAll('.tlg-evt.is-selected').forEach(el => el.classList.remove('is-selected'));
      evtEl.classList.add('is-selected');
      showDetail(evt, exp);
    });
    body.appendChild(evtEl);
  });

  chapter.appendChild(body);
  return chapter;
}

export function unmount() {
  const screen = document.getElementById('screen-timeline');
  if (screen && screenTapHndlr) screen.removeEventListener('pointerdown', screenTapHndlr);
  screenTapHndlr = null;
  detailEl = null;
}

function showDetail(evt, exp) {
  const c    = C[exp.id];
  const date = fmtDate(evt.date);
  const imgs = (evt.images || []).filter(Boolean);

  detailEl.innerHTML = `
    <div class="tlg-detail__inner">
      <div class="tlg-detail__top">
        <span class="tlg-detail__exp" style="color:${c.main}">${exp.name}</span>
        <span class="tlg-detail__date">${date}</span>
        <button class="tlg-detail__close" aria-label="Sluiten">×</button>
      </div>
      <h3 class="tlg-detail__title">${evt.title}</h3>
      ${evt.body ? `<p class="tlg-detail__body">${evt.body}</p>` : ''}
      ${imgs.length ? `<div class="tlg-detail__imgs">${imgs.map(s => `<img src="${s}" class="tlg-detail__img" alt="">`).join('')}</div>` : ''}
      <button class="tlg-detail__goto" style="color:${c.main}" data-id="${exp.id}">Bekijk ${exp.name} →</button>
    </div>`;

  detailEl.classList.add('is-open');

  detailEl.querySelector('.tlg-detail__close').addEventListener('pointerdown', e => {
    e.stopPropagation();
    clearDetail();
  });
  detailEl.querySelector('.tlg-detail__goto').addEventListener('pointerdown', e => {
    e.stopPropagation();
    goTo('expedition', { expeditionId: exp.id });
  });
}

function clearDetail() {
  if (!detailEl) return;
  document.querySelectorAll('.tlg-evt.is-selected').forEach(el => el.classList.remove('is-selected'));
  detailEl.classList.remove('is-open');
  detailEl.innerHTML = `<div class="tlg-detail__idle">← Selecteer een event op de tijdlijn</div>`;
}

function fmtDate(s) {
  const NL = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  const [y, m, d] = s.split('-').map(Number);
  return `${d} ${NL[m - 1]} ${y}`;
}
