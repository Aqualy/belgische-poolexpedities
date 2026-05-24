import { createRng, seedFromTouch } from '../util/rng.js';
import { getIceCanvas, getSize, clearCanvas } from './iceCanvas.js';
import { drawFrozenSurface, getFrozenTexture } from './frozenSurface.js';

// Ice break animation — sharp white fracture lines, no glow, no bloom
// Staggered timing: cracks appear in sequence, shards fall with individual delays

const CRACK_RAYS    = 16;
const STEP_LENGTH   = 30;
const MAX_STEPS     = 42;
const SECONDARY_PROB = 0.22;
const ANIM_DURATION  = 1400; // ms total

let animating = false;

export function breakIce(touchX, touchY, done) {
  if (animating) return;
  animating = true;

  const rng = createRng(seedFromTouch(touchX, touchY));
  const { w, h } = getSize();

  // ── 1. Generate all crack geometry ──
  const primaryCracks = [];
  for (let i = 0; i < CRACK_RAYS; i++) {
    const baseAngle = (i / CRACK_RAYS) * Math.PI * 2;
    const angle = baseAngle + (rng() - 0.5) * 0.28;
    primaryCracks.push(generateCrack(touchX, touchY, angle, rng, w, h));
  }

  const secondaryCracks = [];
  for (const crack of primaryCracks) {
    for (let vi = 2; vi < crack.pts.length - 1; vi++) {
      if (rng() < SECONDARY_PROB) {
        const pt  = crack.pts[vi];
        const prev = crack.pts[vi - 1];
        const branchAngle = Math.atan2(pt.y - prev.y, pt.x - prev.x)
          + (rng() > 0.5 ? 1 : -1) * (Math.PI / 3 + (rng() - 0.5) * 0.35);
        secondaryCracks.push(generateCrack(pt.x, pt.y, branchAngle, rng, w, h, MAX_STEPS * 0.45));
      }
    }
  }

  // ── 2. Assign per-crack reveal timestamps (staggered) ──
  //    Primary cracks: 0 – 180ms staggered
  //    Secondary cracks: 120 – 320ms staggered
  const crackRevealEnd = 300; // ms when last crack is fully visible
  primaryCracks.forEach((crack, i) => {
    crack.revealStart = (i / CRACK_RAYS) * 160;
    crack.revealDur   = 60 + rng() * 40;
  });
  secondaryCracks.forEach((crack, i) => {
    crack.revealStart = 120 + (i / Math.max(1, secondaryCracks.length)) * 180;
    crack.revealDur   = 40 + rng() * 30;
  });

  // ── 3. Build shards with per-shard fall delay ──
  const shards = buildShards(primaryCracks, touchX, touchY, w, h, rng);
  shards.forEach(shard => {
    const cx = shard.centroid.x;
    const cy = shard.centroid.y;
    const dx = cx - touchX;
    const dy = cy - touchY;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = 50 + dist * 0.07;
    shard.vx     = (dx / dist) * speed * (0.5 + rng() * 0.9);
    shard.vy     = (dy / dist) * speed * (0.4 + rng() * 0.8) + 8;
    shard.omega  = (rng() - 0.5) * 0.005;
    shard.rot    = 0;
    // Staggered fall start: 250ms + up to 200ms individual offset
    shard.fallStart = 250 + rng() * 220;
    shard.fallDur   = ANIM_DURATION - shard.fallStart;
  });

  const allCracks = [...primaryCracks, ...secondaryCracks];
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const { w, h } = getSize();
    const { ctx } = getIceCanvas();

    clearCanvas();
    drawFrozenSurface(1);

    // ── Draw cracks with individual staggered reveal ──
    ctx.lineCap  = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 1;

    for (const crack of allCracks) {
      if (crack.pts.length < 2) continue;
      const t = Math.min(1, Math.max(0, (elapsed - crack.revealStart) / crack.revealDur));
      if (t <= 0) continue;

      // Draw only the revealed portion of this crack
      const visibleCount = Math.max(2, Math.round(t * crack.pts.length));

      ctx.strokeStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.moveTo(crack.pts[0].x, crack.pts[0].y);
      for (let i = 1; i < visibleCount; i++) {
        ctx.lineTo(crack.pts[i].x, crack.pts[i].y);
      }
      ctx.stroke();
    }

    // ── Single-frame white flash at impact (80–180ms) ──
    if (elapsed >= 80 && elapsed <= 180) {
      const flashT = (elapsed - 80) / 100;
      ctx.fillStyle = `rgba(255,255,255,${(0.13 * (1 - flashT)).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // ── Shards fall with individual start times ──
    for (const shard of shards) {
      if (elapsed < shard.fallStart) continue;

      const st = (elapsed - shard.fallStart) / shard.fallDur; // 0→1
      if (st > 1) continue;

      const dt = 1 / 60;
      shard.rot += shard.omega;
      shard.vy  += 35 * dt;

      const sx = shard.centroid.x + shard.vx * st * 0.9;
      const sy = shard.centroid.y + shard.vy * st * 0.9;

      // Alpha fades in last 50% of this shard's fall
      const alphaT = Math.max(0, (st - 0.5) / 0.5);
      const alpha  = 1 - alphaT;
      if (alpha <= 0) continue;

      const ox = shard.centroid.x;
      const oy = shard.centroid.y;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(sx, sy);
      ctx.rotate(shard.rot);

      // Build polygon path (centered on shard centroid)
      ctx.beginPath();
      ctx.moveTo(shard.pts[0].x - ox, shard.pts[0].y - oy);
      for (let i = 1; i < shard.pts.length; i++) {
        ctx.lineTo(shard.pts[i].x - ox, shard.pts[i].y - oy);
      }
      ctx.closePath();

      // Clip and fill inside one save/restore block
      ctx.save();
      ctx.clip();
      const tex = getFrozenTexture();
      if (tex) {
        // Draw frozen texture aligned to original screen position
        ctx.drawImage(tex, -ox, -oy, w, h);
      }
      ctx.fillStyle = 'rgba(7,15,28,0.5)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore(); // releases clip

      ctx.restore(); // releases translate/rotate/alpha
    }

    if (elapsed < ANIM_DURATION) {
      requestAnimationFrame(animate);
    } else {
      animating = false;
      clearCanvas();
      done?.();
    }
  }

  requestAnimationFrame(animate);
}

// ── Helpers ──

function generateCrack(startX, startY, angle, rng, w, h, maxSteps = MAX_STEPS) {
  const pts = [{ x: startX, y: startY }];
  let x = startX, y = startY, a = angle;
  for (let i = 0; i < maxSteps; i++) {
    a += (rng() - 0.5) * 0.65;
    x += Math.cos(a) * STEP_LENGTH;
    y += Math.sin(a) * STEP_LENGTH;
    pts.push({ x, y });
    if (x < -60 || x > w + 60 || y < -60 || y > h + 60) break;
  }
  return { pts, revealStart: 0, revealDur: 80 };
}

function buildShards(primaryCracks, cx, cy, w, h, rng) {
  const shards = [];
  const corners = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

  for (let i = 0; i < primaryCracks.length; i++) {
    const crackA = primaryCracks[i];
    const crackB = primaryCracks[(i + 1) % primaryCracks.length];

    const pts = [{ x: cx, y: cy }];
    for (const p of crackA.pts) pts.push({ ...p });

    // Insert nearest screen corner between the two ray endpoints
    const endA   = crackA.pts[crackA.pts.length - 1];
    const endB   = crackB.pts[crackB.pts.length - 1];
    const corner = nearestCornerBetween(endA, endB, corners, cx, cy);
    if (corner) pts.push({ ...corner });

    for (let j = crackB.pts.length - 1; j >= 0; j--) pts.push({ ...crackB.pts[j] });

    shards.push({ pts, centroid: polygonCentroid(pts) });
  }

  return shards;
}

function nearestCornerBetween(endA, endB, corners, cx, cy) {
  const angleA = Math.atan2(endA.y - cy, endA.x - cx);
  const angleB = Math.atan2(endB.y - cy, endB.x - cx);
  let best = null, bestDiff = Infinity;
  for (const c of corners) {
    const ac   = Math.atan2(c.y - cy, c.x - cx);
    const diff = angularDistanceBetween(angleA, angleB, ac);
    if (diff < bestDiff) { bestDiff = diff; best = c; }
  }
  return best;
}

function angularDistanceBetween(a, b, c) {
  const n = v => ((v % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const na = n(a), nb = n(b), nc = n(c);
  const lo = Math.min(na, nb), hi = Math.max(na, nb);
  if (nc >= lo && nc <= hi) return 0;
  return Math.min(Math.abs(nc - lo), Math.abs(nc - hi));
}

function polygonCentroid(pts) {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}
