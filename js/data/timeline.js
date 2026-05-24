import { expeditions } from './expeditions.js';

// Build a flat, chronologically sorted array of all events across all expeditions
function buildTimeline() {
  const events = [];
  for (const exp of expeditions) {
    for (const evt of exp.timeline) {
      events.push({ ...evt, expeditionId: exp.id });
    }
  }
  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

export const globalTimeline = buildTimeline();

// Year range for the global timeline view
export const timelineRange = { start: 1897, end: 2026 };
