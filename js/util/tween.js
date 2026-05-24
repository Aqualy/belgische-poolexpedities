// Easing functions
export const ease = {
  linear: t => t,
  out: t => 1 - Math.pow(1 - t, 3),
  ice: t => {
    // cubic-bezier(0.16, 0.84, 0.32, 1) approximation
    const c = 3 * 0.16;
    const b = 3 * (0.84 - 0.16) - c;
    const a = 1 - c - b;
    return ((a * t + b) * t + c) * t;
  },
  inOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
};

// Animate a value over time
// Returns a cancel function
export function tween({ from, to, duration, easing = ease.out, onUpdate, onDone }) {
  const start = performance.now();
  let cancelled = false;

  function tick(now) {
    if (cancelled) return;
    const elapsed = now - start;
    const t = Math.min(elapsed / duration, 1);
    const value = from + (to - from) * easing(t);
    onUpdate(value);
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      onDone?.();
    }
  }

  requestAnimationFrame(tick);
  return () => { cancelled = true; };
}

// Lerp
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Clamp
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
