// Seeded pseudo-random number generator (mulberry32)
// Reproducible across sessions when seeded with the same value
export function createRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed from touch coordinates, rounded to 10px for reproducibility
export function seedFromTouch(x, y) {
  const rx = Math.round(x / 10) * 10;
  const ry = Math.round(y / 10) * 10;
  return (rx * 73856093) ^ (ry * 19349663);
}
