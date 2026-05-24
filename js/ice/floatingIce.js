import { getIceCanvas, getSize } from './iceCanvas.js';
import { drawFrozenSurface } from './frozenSurface.js';
import { archiveItems } from '../data/archive.js';

// Heavy ice floes drifting slowly on arctic water
// Images are pre-tinted at load time via OffscreenCanvas for reliable rendering

const FLOE_COUNT    = 8;
const TARGET_FPS    = 30;
const TARGET_MS     = 1000 / TARGET_FPS;

const FLOAT_CANDIDATES = [
  'img/12504_adrien-de-gerlache.jpg',
  'img/12496_roald-amundsen.jpg',
  'img/12500_frederick-albert-cook.jpg',
  'img/12499_henryck-arctowski.jpg',
  'img/12501_emile-racovitza.jpg',
  'img/3142_belgica.jpg',
  'img/5602_belgica.jpg',
  'img/5311_belgica-in-antwerpen-1897.jpg',
  'img/9399_bemanning-van-de-belgica.jpg',
  'img/12513_emile-danco.jpg',
];

// Both raw and pre-tinted versions
const rawImages    = {};  // src → HTMLImageElement
const tintedImages = {};  // src → OffscreenCanvas or HTMLCanvasElement

let floes   = [];
let running = false;
let rafId   = null;
let lastFrame = 0;

// ── Preload ──

export function preloadFloatImages() {
  const promises = FLOAT_CANDIDATES.map(src =>
    new Promise(resolve => {
      const img = new Image();
      img.onload  = () => { rawImages[src] = img; resolve(); };
      img.onerror = () => resolve();
      img.src = src;
    })
  );
  // Always resolves — tinting failures are non-fatal
  return Promise.all(promises).then(() => {
    for (const [src, img] of Object.entries(rawImages)) {
      try {
        tintedImages[src] = createTintedCanvas(img);
      } catch (_) {
        tintedImages[src] = null; // will fall back to raw image in draw()
      }
    }
  });
}

function createTintedCanvas(img) {
  const w = img.naturalWidth  || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;

  // Cap canvas size to avoid GPU texture limits
  const maxSide = 1024;
  const scale   = Math.min(1, maxSide / Math.max(w, h));
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  let canvas, ctx;
  try {
    canvas = new OffscreenCanvas(cw, ch);
    ctx    = canvas.getContext('2d');
  } catch (_) {
    canvas = document.createElement('canvas');
    canvas.width = cw; canvas.height = ch;
    ctx = canvas.getContext('2d');
  }

  // Everything wrapped — drawImage can throw for broken/cross-origin images
  try {
    ctx.filter = 'grayscale(1) brightness(0.82) contrast(1.12)';
    ctx.drawImage(img, 0, 0, cw, ch);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(90,140,175,0.30)';
    ctx.fillRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'source-over';
  } catch (_) {
    return null;
  }

  return canvas;
}

// ── Floe creation ──

export function initFloes() {
  const { w, h } = getSize();
  floes = [];
  const srcs = FLOAT_CANDIDATES.filter(s => tintedImages[s]);

  for (let i = 0; i < FLOE_COUNT; i++) {
    floes.push(makeFloe(srcs[i % srcs.length], w, h));
  }
}

function makeFloe(src, w, h) {
  const scale = 0.11 + Math.random() * 0.13;
  const fw    = Math.round(w * scale);
  const fh    = Math.round(fw * 0.74);

  const speed      = 2 + Math.random() * 3.5;
  const driftAngle = -0.08 + Math.random() * 0.2;

  return {
    src,
    x:   Math.random() * w,
    y:   Math.random() * h,
    vx:  Math.cos(driftAngle) * speed,
    vy:  Math.sin(driftAngle) * speed * 0.25,
    rot: (Math.random() - 0.5) * 0.12,
    omega: (Math.random() - 0.5) * 0.006,
    w: fw, h: fh,
    shape: makeShape(fw, fh),
    bobPhase: Math.random() * Math.PI * 2,
    bobFreq:  0.25 + Math.random() * 0.35,
    bobAmp:   4    + Math.random() * 7,
    noisePhaseA: Math.random() * Math.PI * 2,
    noisePeriodA: 9  + Math.random() * 10,
    noisePhaseB: Math.random() * Math.PI * 2,
    noisePeriodB: 22 + Math.random() * 14,
    infoVisible: false,
  };
}

function makeShape(w, h) {
  const sides = 7 + Math.floor(Math.random() * 4);
  return Array.from({ length: sides }, (_, i) => {
    const a  = (i / sides) * Math.PI * 2;
    const rx = (w / 2) * (0.72 + Math.random() * 0.28);
    const ry = (h / 2) * (0.72 + Math.random() * 0.28);
    return { x: Math.cos(a) * rx, y: Math.sin(a) * ry };
  });
}

// ── Loop ──

export function startFloating() {
  if (running) return;
  running   = true;
  lastFrame = performance.now();
  rafId = requestAnimationFrame(tick);
}

export function stopFloating() {
  running = false;
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
}

function tick(now) {
  if (!running) return;
  const elapsed = now - lastFrame;
  if (elapsed < TARGET_MS) { rafId = requestAnimationFrame(tick); return; }
  lastFrame = now - (elapsed % TARGET_MS);

  const { w, h }   = getSize();
  const { ctx }    = getIceCanvas();
  if (!ctx) { rafId = requestAnimationFrame(tick); return; }
  const t = now / 1000;

  ctx.clearRect(0, 0, w, h);
  drawFrozenSurface(1);

  for (const floe of floes) {
    update(floe, t, w, h);
    draw(ctx, floe, t);
  }

  rafId = requestAnimationFrame(tick);
}

function update(floe, t, w, h) {
  const noiseX = Math.sin(t / floe.noisePeriodA + floe.noisePhaseA) * 0.7
               + Math.sin(t / floe.noisePeriodB + floe.noisePhaseB) * 0.3;
  const dt = 1 / TARGET_FPS;
  floe.x  += (floe.vx + noiseX) * dt;
  floe.y  += floe.vy * dt;
  floe.rot += floe.omega;

  if (floe.x > w + floe.w)   { floe.x = -floe.w; floe.y = Math.random() * h; }
  if (floe.x < -floe.w * 2)  { floe.x = w + floe.w; floe.y = Math.random() * h; }
  if (floe.y > h + floe.h)   floe.y = -floe.h;
  if (floe.y < -floe.h * 2)  floe.y = h + floe.h;
}

function draw(ctx, floe, t) {
  const tinted = tintedImages[floe.src] || rawImages[floe.src];
  if (!tinted) return;

  const bob = Math.sin(t * floe.bobFreq + floe.bobPhase) * floe.bobAmp;

  ctx.save();
  ctx.translate(floe.x, floe.y + bob);
  ctx.rotate(floe.rot);

  // Clip path
  ctx.beginPath();
  ctx.moveTo(floe.shape[0].x, floe.shape[0].y);
  for (let i = 1; i < floe.shape.length; i++) ctx.lineTo(floe.shape[i].x, floe.shape[i].y);
  ctx.closePath();

  ctx.save();
  ctx.clip();
  ctx.drawImage(tinted, -floe.w / 2, -floe.h / 2, floe.w, floe.h);
  ctx.restore();

  // 1px hard edge
  ctx.strokeStyle = 'rgba(244,249,252,0.48)';
  ctx.lineWidth   = 1;
  ctx.stroke();

  // Info label below floe
  if (floe.infoVisible) drawInfo(ctx, floe);

  ctx.restore();
}

function drawInfo(ctx, floe) {
  const item = archiveItems.find(a => a.file === floe.src);
  if (!item) return;

  const barY = floe.h / 2 + 3;

  ctx.strokeStyle = 'rgba(244,249,252,0.7)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(-floe.w / 2, barY);
  ctx.lineTo( floe.w / 2, barY);
  ctx.stroke();

  ctx.fillStyle = 'rgba(7,15,28,0.9)';
  ctx.fillRect(-floe.w / 2, barY + 1, floe.w, 50);

  const maxChars = Math.floor(floe.w / 8);
  const title    = item.title.length > maxChars ? item.title.slice(0, maxChars - 1) + '…' : item.title;

  ctx.fillStyle    = 'rgba(244,249,252,0.92)';
  ctx.font         = `13px "Courier New",monospace`;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(title, -floe.w / 2 + 7, barY + 7);

  ctx.fillStyle = 'rgba(126,184,212,0.8)';
  ctx.font      = `10px "Courier New",monospace`;
  ctx.fillText(item.date, -floe.w / 2 + 7, barY + 28);
}

// ── Hit test ──

export function hitTestFloe(x, y) {
  const t = performance.now() / 1000;
  for (let i = floes.length - 1; i >= 0; i--) {
    const f   = floes[i];
    const bob = Math.sin(t * f.bobFreq + f.bobPhase) * f.bobAmp;
    const lx  = x - f.x;
    const ly  = y - (f.y + bob);
    const cos = Math.cos(-f.rot), sin = Math.sin(-f.rot);
    const rx  = lx * cos - ly * sin;
    const ry  = lx * sin + ly * cos;
    if (pointInPoly(rx, ry, f.shape)) return i;
  }
  return -1;
}

export function toggleFloeInfo(idx) {
  for (let i = 0; i < floes.length; i++) {
    floes[i].infoVisible = (i === idx) && !floes[i].infoVisible;
  }
}

export function hideAllFloeInfo() {
  for (const f of floes) f.infoVisible = false;
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
