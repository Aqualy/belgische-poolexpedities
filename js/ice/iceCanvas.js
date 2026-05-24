// Canvas setup with DPR support, capped at 2
let canvas, ctx;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

export function initIceCanvas() {
  canvas = document.getElementById('ice-canvas');
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return { canvas, ctx, DPR };
}

export function getIceCanvas() {
  return { canvas, ctx, DPR };
}

function resize() {
  if (!ctx) return; // guard: resize may fire before init
  const w = window.innerWidth;
  const h = window.innerHeight;
  // Setting canvas.width resets the transform — always re-apply scale after
  canvas.width  = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); // explicit — avoids accumulation
}

export function clearCanvas() {
  if (!ctx) return;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
}

export function getSize() {
  return { w: window.innerWidth, h: window.innerHeight };
}
