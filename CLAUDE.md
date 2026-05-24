# BELGISCHE POOLEXPEDITIES — Project Handoff

## How to serve
```
npm run dev
```
Open: http://localhost:5173/ (Vite may use 5174+ if 5173 is taken — check terminal output)

**Do NOT use `python -m http.server`** — the project uses React + JSX (`reactMap.jsx`) which requires Vite to transpile. The Python server will fail to load the expedition map.

---

## What is built

**Hi-fi interactive touchwall prototype** (1920×1080, Chromium kiosk) for museum display of 3 Belgian Antarctic expeditions.

### Screens (all implemented)
| Screen ID | File | Status |
|---|---|---|
| `attract` | `js/ui/attract.js` | Working |
| `overview` | `js/ui/overview.js` | Working |
| `expedition` | `js/ui/expedition.js` | Working, map + data column |
| `timeline` | `js/ui/timelineGlobal.js` | Working — 3-column equal-chapter layout, no external deps |
| `archive` | `js/ui/archive.js` | Working, lightbox on body |
| `person` | `js/ui/person.js` | Working |
| Search overlay | `js/ui/search.js` | Working |

### Navigation flow
```
attract ──[tap anywhere]──▶ overview
overview ──[tap card]──────▶ expedition (zoom transition)
overview ──[Tijdlijn nav]──▶ timeline
overview ──[Archief nav]───▶ archive
expedition ──[Bemanning]───▶ person
expedition ──[Archief]─────▶ archive (filtered)
expedition ──[Kaarten]─────▶ map comparison overlay (on body)
expedition ──[Schip]───────▶ ship plan overlay (on body)
expedition ──[Logistiek]───▶ logistics panel (on body)
expedition ──[image thumb]─▶ lightbox opens in-place (no navigation)
search ──[image result]────▶ lightbox opens in-place (no navigation)
any ──[90s idle]───────────▶ attract
```

---

## Architecture

### Layer stack (z-index)
```
ice canvas       z-index: 10 (default, behind UI)
ice canvas       z-index: 30 (attract state only, via .is-attract)
UI layer         z-index: 30 (#ui-layer, pointer-events: none by default)
screens          pointer-events: auto only when .is-active
breadcrumb       z-index: 35 (bottom: 0, height: 44px)
nav bar          z-index: 35 (bottom: 44px, height: 56px — sits above breadcrumb)
person crew strip z-index: 36 (bottom: 100px — above both nav bar and breadcrumb)
ship/map/search  z-index: 38 (position:fixed on body — outside stacking context)
lightbox         z-index: 40 (position:fixed on body)
preloader        z-index: 50
```

**CRITICAL ARCHITECTURE RULE**: All overlays (ship plan, map comparison, logistics, lightbox,
timeline event cards) MUST be appended to `document.body`, NOT to screen elements.
This places them in the root stacking context, above the nav bar (z-35) and breadcrumb (z-35).

### Lightbox pattern
- `openLightbox(item)` exported from `js/ui/archive.js` — callable from any screen
- `closeLightbox()` exported from `js/ui/archive.js` — called by every `unmount()` AND at
  the start of every screen transition in `screens.js` (safety net)
- The lightbox starts hidden (`opacity:0; pointer-events:none`)
- Opening: sets `pointer-events:auto` then `opacity:1` in a rAF
- Has a 300ms guard to prevent residual pointer events from immediately closing it
- Do NOT navigate to archive just to show an image — call `openLightbox(item)` directly

### Navigation pattern
- `goTo(screen, params, kind)` — normal navigation, pushes current to back-stack
- `navigateTo(screen, params)` — top-level nav (nav bar, goHome), clears back-stack
- `goBack()` — pops history
- Nav bar links MUST use `navigateTo` to prevent history piling up
- Breadcrumb bar shows ONLY ← Terug and Overzicht — no trail text

### Timeline design
- 3 equal-width expedition chapters (not date-scaled — Belgica's 2 years is the same
  width as BELARE's 22 years to avoid 90% empty space)
- Events within each chapter are EVENLY SPACED (not date-positioned)
- Tapping an event shows a detail panel that slides up from the bottom (inside the screen)
- No global date axis, no scrub mechanism — events are the content, not the timeline

---

## Key modules
- `js/state.js` — Single AppState object, screen/params/history/filters
- `js/ui/screens.js` — Screen registry, `goTo`, `navigateTo`, `goBack`, `goHome`, transitions
- `js/ice/` — Canvas ice system (frozen texture, floating floes, crack animation)
- `js/map/` — SVG polar stereographic map, routes, waypoints
- `js/data/` — All content (expeditions, people, archive, timeline)

---

## Bugs fixed (session 4, 2026-05-04)

### Preloader freeze (page stuck on boot)
`createTintedCanvas()` in floatingIce.js called `ctx.drawImage(img, 0, 0)` OUTSIDE any
try/catch. If drawImage throws (OffscreenCanvas size limit, CORS, corrupted image, etc.),
the `.then()` callback rejected, `boot()` stopped, preloader stayed forever with no error.

Fixes applied:
1. `createTintedCanvas` — entire rendering block wrapped in try/catch; returns null on failure
2. Images capped to 1024px to avoid GPU texture size limits
3. `.then()` in `preloadFloatImages` — each `createTintedCanvas` call wrapped individually
4. `boot()` — `await preloadFloatImages()` wrapped in try/catch; continues on failure
5. `main.js` — 6-second global timeout always dismisses preloader
6. `boot().catch()` — calls `dismissPreloader()` even if boot fails completely
7. `draw()` in floatingIce — falls back to raw image if tinted version is null

## Bugs fixed (session 3, 2026-05-04)

### Lightbox always covers archive (root cause found)
When `openLightbox()` was called from expedition screen (via image thumbs), the lightbox
opened at `opacity:1`. Then when navigating to archive, `expedition.unmount()` did NOT close
the lightbox (closeLightbox was private). Archive mounted BEHIND the open lightbox.

Fix:
1. `closeLightbox` is now exported from archive.js
2. Called at the START of every screen transition in `screens.js` (safety net for all cases)
3. `expedition.js` imports `archiveItems` directly (no more async dynamic import in event handler)
4. Search results call `openLightbox` directly, not after a setTimeout

### Breadcrumb trail overflow
Trail text accumulated every page visit, caused overflow and visual clutter.
Fix: Breadcrumb now shows ONLY "← Terug" and "Overzicht" — no trail text at all.
`updateBreadcrumb()` is a no-op.

### Timeline overlapping
Date-based positioning crammed Belgica's 10 events (1897-1899) into 1.5% of a 129-year
axis, causing complete overlap. The large background year number also overlapped labels.
Fix: Redesigned as 3 equal-width chapters with evenly-spaced events. Removed the global
date axis, year display, and scrub mechanism entirely.

---

## Known remaining issues

### MEDIUM

**Bug A: Expedition cards in overview may show broken images if path 404s**
- `exp.cardImage` points to `img/3142_belgica.jpg` etc — verify paths are correct
- Fix if needed: add `img.onerror` to hide the wrapper

**Bug B: Waypoint cards position after pan/zoom**
- `showWaypointCard` in routes.js converts SVG→screen coords using `svgEl.viewBox.baseVal`
- After panning/zooming, this conversion should still be correct — needs testing on touch device

**Bug C: Person screen crew strip may overlap data column on narrow viewports**
- `.person-crew-strip { position:fixed; bottom:44px }` — correct on 1920×1080
- On smaller screens the data column may be hidden behind it

---

## Design rules (NON-NEGOTIABLE — do not deviate)

1. **NO glow effects** — no `shadowBlur`, no `text-shadow`, no CSS glow
2. **NO pulsating animations** — no opacity loops, no scale pulses
3. **NO sans-serif as primary voice** — Cormorant Garamond for all editorial, Courier New for all data/labels
4. **NO decorative buttons** — navigation is typographic text links only
5. **Motion must carry information** — route draw-on, temperature graph, shard fall: all purposeful
6. **Every element earns its place** — if removable without information loss, remove it
7. **Ice break**: sharp white lines, 1px, NO blur. Single-frame flash at 0.15 alpha max
8. **Floating images**: slow (2–5px/s), heavy feel, irregular polygon clips, 1px hard edge

---

## Color palette (exact)
```
--c-bg:      #070F1C  (near-black arctic — body background)
--c-surface: #0D1B2A  (panels)
--c-ice-1:   #F4F9FC  (near white — headlines, primary text)
--c-ice-2:   #B8D4E8  (light ice blue — pull quotes, epitaph)
--c-ice-3:   #7EB8D4  (mid ice blue — routes, labels, links)
--c-ice-4:   #4A90B8  (deeper ice blue — rules, lat rings, dim labels)
--c-rule:    rgba(74,144,184,0.28)  (dividing lines)
```

---

## Content data locations
- `js/data/expeditions.js` — 3 expeditions with full route, timeline, stats, temperature data
- `js/data/people.js` — 8 crew members (de-gerlache, amundsen, cook, lecointe, arctowski, racovitza, danco, nansen)
- `js/data/archive.js` — 35 archive items with tags and expedition IDs
- `js/data/timeline.js` — Flat sorted event array built from expeditions

---

## Files that are correct and should NOT be changed without reason
- All `css/` files — design system is solid
- `js/util/rng.js` — seeded RNG works correctly
- `js/util/tween.js` — easing functions correct
- `js/data/` — all content verified
- `js/map/projection.js` — polar stereographic projection correct

---

## Tijdlijn page — final implementation (session 6, 2026-05-24)

vis-timeline was abandoned. The date-scaled approach made all three expeditions unreadable
simultaneously: Belgica (2 years), IGY (1 year), and BELARE (22 years) at any single zoom
that showed all three compressed events to indistinguishable blobs.

### Current implementation — pure CSS/HTML three-column layout

`js/ui/timelineGlobal.js` (no external dependencies):
- Three equal-width chapters (`.tlg-chapter`) in a flex row (`.tlg-chapters`)
- Each chapter: 68px header (3px accent strip, years, expedition name, leader) + flex-1 body
- Body uses `display:flex; flex-direction:column; justify-content:space-between` — events
  are automatically evenly distributed regardless of count (Belgica: 10, IGY/BELARE: 4)
- Vertical rail line at `left:32px` (position:absolute, 22% opacity) as visual connector
- Event dots: 8px hollow, 12px filled (major = first/last event), centred on rail at x=32px
  via `margin-left: 28px` (non-major) / `margin-left: 26px` (major 12px dot)
- NOTE: `exp.timeline[]` items have no `type` field — only route items do. `MAJOR_TYPES.has(evt.type)` is always false; only `i===0` and `i===last` are major.
- Clicking an event → `showDetail(evt, exp)` — detail panel (240px) slides up from bottom
- Detail panel: expedition name (coloured), Dutch date, Cormorant title, body text, images, "Bekijk X →" link
- `unmount()` removes the `pointerdown` listener stored in `screenTapHndlr`

### Key CSS (in `css/screens.css`)
- `.tlg-chapters`: `flex:1; display:flex; align-items:stretch`
- `.tlg-chapter__body`: `flex:1; display:flex; flex-direction:column; justify-content:space-between; padding:28px 0; position:relative`
- `.tlg-chapter__line`: `position:absolute; left:32px; top:28px; bottom:28px; border-left:1px solid; opacity:0.22`
- `.tlg-evt`: `display:flex; align-items:center; min-height:44px` (touch-safe)
- `.tlg-evt__dot`: `width:8px; height:8px; border-radius:50%; border:1.5px solid; margin-left:28px`

---

## Next session
1. QA at 1920×1080 Chrome kiosk: check expedition card images load (Bug A), waypoint card positioning after pan/zoom (Bug B)
2. Verify detail panel tap interaction on a real touchscreen
