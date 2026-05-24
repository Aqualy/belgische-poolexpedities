import { people } from '../data/people.js';
import { expeditions } from '../data/expeditions.js';
import { goTo } from './screens.js';
import { h, formatDate } from '../util/dom.js';

let currentPersonId = null;

export function mount({ personId } = {}) {
  currentPersonId = personId;
  const screen = document.getElementById('screen-person');
  screen.innerHTML = '';
  renderPerson(screen, personId);
}

export function unmount() {}

function renderPerson(screen, personId) {
  const person = people[personId];
  if (!person) return;

  const spread = h('div', { class: 'person-spread' });

  // Left: portrait
  const portraitCol = h('div', { class: 'person-spread__portrait' });
  const img = h('img', { src: person.portrait, alt: person.name, class: 'tinted' });
  portraitCol.appendChild(img);

  // Name overlay on portrait
  const nameOverlay = h('div', { class: 'person-spread__name-overlay' });
  nameOverlay.appendChild(h('div', { class: 't-h1', style: 'margin-bottom:0.25rem;' }, person.name));

  // Dates
  if (person.born || person.died) {
    const dates = [
      person.born ? `° ${person.born}` : '',
      person.died ? `† ${person.died}` : '',
    ].filter(Boolean).join(' · ');
    nameOverlay.appendChild(h('div', { class: 't-label' }, dates));
  }

  portraitCol.appendChild(nameOverlay);
  spread.appendChild(portraitCol);

  // Right: data
  const dataCol = h('div', { class: 'person-spread__data' });

  // Role
  dataCol.appendChild(h('div', { class: 't-label', style: 'margin-bottom:1.5rem;' }, person.role));

  // Bio paragraphs
  for (const para of person.bio) {
    const p = h('p', { class: 't-body', style: 'margin-bottom:1.25rem;' }, para);
    dataCol.appendChild(p);
  }

  // Death note (Danco)
  if (person.note) {
    dataCol.appendChild(h('div', { class: 't-epitaph' }, person.note));
  }

  // Alt portrait link if available
  if (person.altPortrait) {
    const altWrap = h('div', { style: 'margin-top:2rem;' });
    altWrap.appendChild(h('div', { class: 't-label', style: 'margin-bottom:0.75rem;' }, 'Later portret'));
    const altImg = h('img', {
      src: person.altPortrait,
      alt: `${person.name} — later portret`,
      class: 'tinted',
      style: 'width:120px;height:120px;object-fit:cover;border:1px solid rgba(74,144,184,0.3);',
    });
    altWrap.appendChild(altImg);
    dataCol.appendChild(altWrap);
  }

  spread.appendChild(dataCol);
  screen.appendChild(spread);

  // Crew strip at bottom
  const exp = expeditions.find(e => e.crew && e.crew.includes(personId));
  if (exp && exp.crew.length > 1) {
    const strip = buildCrewStrip(exp.crew, personId);
    screen.appendChild(strip);
  }
}

function buildCrewStrip(crewIds, activePerson) {
  const strip = h('div', { class: 'person-crew-strip' });

  for (const id of crewIds) {
    const p = people[id];
    if (!p) continue;

    const thumb = h('div', { class: `person-crew-thumb${id === activePerson ? ' is-active' : ''}` });
    const img = h('img', { src: p.portrait, alt: p.name });
    thumb.appendChild(img);

    thumb.addEventListener('pointerdown', () => {
      goTo('person', { personId: id });
    });

    strip.appendChild(thumb);
  }

  return strip;
}
