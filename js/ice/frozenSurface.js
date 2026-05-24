import { getIceCanvas, getSize } from './iceCanvas.js';

// Procedural frozen ice surface — Voronoi-cell grain pattern
// Painted once, then blitted. Static — no animation on the surface.

let frozenTexture = null;

export function buildFrozenTexture() {
  if (frozenTexture) return frozenTexture; // already built
  const { w, h } = getSize();

  // Use OffscreenCanvas if available (Chrome), fall back to a regular canvas
  let offscreen, octx;
  try {
    offscreen = new OffscreenCanvas(w, h);
    octx = offscreen.getContext('2d');
  } catch (_) {
    offscreen = document.createElement('canvas');
    offscreen.width  = w;
    offscreen.height = h;
    octx = offscreen.getContext('2d');
  }

  // Base — deep arctic night
  octx.fillStyle = '#081422';
  octx.fillRect(0, 0, w, h);

  // Voronoi-like cell grain (sample grid for performance)
  const cellCount = 70;
  const cells = Array.from({ length: cellCount }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
  }));

  const step = 5;
  for (let px = 0; px <= w; px += step) {
    for (let py = 0; py <= h; py += step) {
      let d1 = Infinity, d2 = Infinity;
      for (const c of cells) {
        const d = Math.sqrt((px - c.x) ** 2 + (py - c.y) ** 2);
        if (d < d1) { d2 = d1; d1 = d; }
        else if (d < d2) { d2 = d; }
      }
      // Distance to nearest cell boundary
      const t = Math.min((d2 - d1) / 28, 1);
      octx.fillStyle = `rgba(72,128,${168 + Math.round(t * 28)},${(0.12 + t * 0.22).toFixed(2)})`;
      octx.fillRect(px, py, step, step);
    }
  }

  // Pre-baked faint micro-cracks for texture
  octx.strokeStyle = 'rgba(200,225,240,0.1)';
  octx.lineWidth = 0.7;
  const crackSeeds = [
    [w*0.15, h*0.28, w*0.32, h*0.62],
    [w*0.60, h*0.08, w*0.78, h*0.44],
    [w*0.42, h*0.68, w*0.66, h*0.94],
    [w*0.85, h*0.55, w*0.96, h*0.82],
    [w*0.04, h*0.78, w*0.22, h*0.97],
    [w*0.50, h*0.30, w*0.68, h*0.58],
  ];
  for (const [x1, y1, x2, y2] of crackSeeds) {
    octx.beginPath();
    octx.moveTo(x1, y1);
    const steps = 7;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      octx.lineTo(
        x1 + (x2 - x1) * t + (Math.random() - 0.5) * 55,
        y1 + (y2 - y1) * t + (Math.random() - 0.5) * 38,
      );
    }
    octx.stroke();
  }

  // Subtle noise pass
  try {
    const imgData = octx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      data[i]     = Math.max(0, Math.min(255, data[i]     + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    octx.putImageData(imgData, 0, 0);
  } catch (_) {
    // OffscreenCanvas getImageData may fail in some environments — skip noise
  }

  frozenTexture = offscreen;
  return offscreen;
}

export function drawFrozenSurface(alpha = 1) {
  const { ctx } = getIceCanvas();
  const { w, h } = getSize();
  if (!ctx) return;
  if (!frozenTexture) buildFrozenTexture();
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(frozenTexture, 0, 0, w, h);
  ctx.restore();
}

export function getFrozenTexture() {
  return frozenTexture;
}

export function clearFrozenTexture() {
  frozenTexture = null;
}
