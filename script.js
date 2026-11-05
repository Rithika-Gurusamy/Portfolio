/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & 4-color palette configuration
     2. initParticles() — interactive round glass particles
     3. initWave()      — clean static trading line (big ridges)
     4. init()          — bootstrap
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & COLOR PALETTES
   ═══════════════════════════════════════════════════════════════ */

const COLOR = {
  cream: '#FEFFED',
  blue : '#20309A',
  red  : '#BB232B',
};

/**
 * 4-Color Palettes for Round Glass Particles:
 *   1. Olive / Moss Green
 *   2. Deep Espresso / Dark Chocolate Brown
 *   3. Charcoal / Slate Grey
 *   4. Burnt Ochre / Mustard Yellow
 */
const PARTICLE_PALETTES = [
  // 1. Olive / Moss Green
  {
    name     : 'olive',
    highlight: 'rgba(152, 180, 100, 0.55)',
    mid      : 'rgba(92, 114, 52, 0.72)',
    deep     : 'rgba(58, 76, 30, 0.88)',
    rimLight : 'rgba(180, 210, 125, 0.85)',
    rimDark  : 'rgba(58, 76, 30, 0.50)',
    shadow   : 'rgba(58, 76, 30, 0.22)',
  },
  // 2. Deep Espresso / Dark Chocolate Brown
  {
    name     : 'espresso',
    highlight: 'rgba(115, 75, 54, 0.50)',
    mid      : 'rgba(58, 34, 22, 0.78)',
    deep     : 'rgba(36, 19, 11, 0.92)',
    rimLight : 'rgba(150, 105, 80, 0.75)',
    rimDark  : 'rgba(36, 19, 11, 0.55)',
    shadow   : 'rgba(36, 19, 11, 0.25)',
  },
  // 3. Charcoal / Slate Grey
  {
    name     : 'charcoal',
    highlight: 'rgba(120, 134, 145, 0.50)',
    mid      : 'rgba(54, 63, 72, 0.74)',
    deep     : 'rgba(34, 40, 46, 0.90)',
    rimLight : 'rgba(155, 170, 182, 0.80)',
    rimDark  : 'rgba(34, 40, 46, 0.52)',
    shadow   : 'rgba(34, 40, 46, 0.22)',
  },
  // 4. Burnt Ochre / Mustard Yellow
  {
    name     : 'mustard',
    highlight: 'rgba(238, 190, 80, 0.58)',
    mid      : 'rgba(206, 122, 34, 0.76)',
    deep     : 'rgba(168, 90, 18, 0.90)',
    rimLight : 'rgba(250, 210, 115, 0.85)',
    rimDark  : 'rgba(168, 90, 18, 0.52)',
    shadow   : 'rgba(168, 90, 18, 0.22)',
  },
];

/**
 * Particle visual & physics config.
 */
const PARTICLE_CFG = {
  minRadius    : 2.8,      // px
  maxRadius    : 6.2,      // px
  speed        : 0.45,     // idle drift speed (px/frame at 60fps)
  waveFreq     : 0.012,    // sine wave frequency for organic drift
  waveAmp      : 0.6,      // amplitude of sine offset
  mouseRadius  : 175,      // px — push radius around cursor
  pushStrength : 6.8,      // force multiplier at centre of push radius
  damping      : 0.88,     // velocity damping (< 1 = smooth friction)
  returnK      : 0.045,    // spring constant pulling back to home
  targetDensity: 1 / 2300, // particles per px² of viewport
  minCount     : 280,
  maxCount     : 620,
};

/**
 * Static trading line normalized points (0.0 to 1.0).
 * Big, bold, clean price ridges with an overall upward trend.
 * Exactly 11 points creating bold peaks and valleys.
 */
const TRADE_POINTS = [
  { x: 0.00, y: 0.75 }, // starting baseline
  { x: 0.09, y: 0.64 }, // initial climb
  { x: 0.18, y: 0.78 }, // big dip / pullback
  { x: 0.29, y: 0.44 }, // big upward surge
  { x: 0.40, y: 0.58 }, // healthy correction dip
  { x: 0.52, y: 0.32 }, // big breakout peak
  { x: 0.64, y: 0.47 }, // consolidation dip
  { x: 0.75, y: 0.24 }, // major rally peak
  { x: 0.85, y: 0.35 }, // retest dip
  { x: 0.94, y: 0.16 }, // aggressive high
  { x: 1.00, y: 0.10 }, // latest all-time high point
];

/** True if the user prefers reduced motion */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Helpers */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (min, max) => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  ROUND GLASS PARTICLES
   ═══════════════════════════════════════════════════════════════ */

function initParticles() {

  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let   dpr    = window.devicePixelRatio || 1;

  let W = 0, H = 0;
  let mouse = null;
  let particles = [];

  /**
   * Creates one round particle with one of the 4 designated colors.
   */
  function makeParticle(x, y) {
    const palIndex = Math.floor(Math.random() * PARTICLE_PALETTES.length);
    return {
      hx      : x,
      hy      : y,
      x       : x,
      y       : y,
      vx      : rnd(-0.4, 0.4),
      vy      : rnd(-0.4, 0.4),
      phase   : rnd(0, Math.PI * 2),
      radius  : rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      palette : PARTICLE_PALETTES[palIndex],
    };
  }

  function buildParticles() {
    const area  = W * H;
    const count = clamp(
      Math.round(area * PARTICLE_CFG.targetDensity),
      PARTICLE_CFG.minCount,
      PARTICLE_CFG.maxCount,
    );

    while (particles.length > count) particles.pop();
    while (particles.length < count) {
      particles.push(makeParticle(rnd(0, W), rnd(0, H)));
    }

    if (particles.length === count) {
      const cols = Math.ceil(Math.sqrt(count * (W / H)));
      const rows = Math.ceil(count / cols);
      particles.forEach((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        p.hx = (col + 0.5 + rnd(-0.4, 0.4)) * (W / cols);
        p.hy = (row + 0.5 + rnd(-0.4, 0.4)) * (H / rows);
      });
    }
  }

  function resizeCanvas() {
    dpr = window.devicePixelRatio || 1;
    W   = window.innerWidth;
    H   = window.innerHeight;

    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildParticles();
  }

  let frameCount = 0;
  let rafId      = null;

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);

    frameCount++;
    const t = frameCount * 0.016;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (REDUCED_MOTION) {
        drawRoundGlass(ctx, p.hx, p.hy, p.radius, p.palette);
        continue;
      }

      // Idle natural drift
      const driftAngle = p.phase + t * PARTICLE_CFG.speed;
      const idleVx = Math.cos(driftAngle) * PARTICLE_CFG.waveAmp * PARTICLE_CFG.speed;
      const idleVy = Math.sin(driftAngle * PARTICLE_CFG.waveFreq * 60) * PARTICLE_CFG.waveAmp * PARTICLE_CFG.speed;

      // Spring toward home anchor
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      // Mouse / touch repulsion
      let pushVx = 0, pushVy = 0;
      if (mouse) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const r  = PARTICLE_CFG.mouseRadius;
        if (d2 < r * r && d2 > 0.001) {
          const d      = Math.sqrt(d2);
          const factor = (1 - d / r);
          const force  = factor * factor * PARTICLE_CFG.pushStrength;
          pushVx = (dx / d) * force;
          pushVy = (dy / d) * force;
        }
      }

      // Physics integration
      p.vx = (p.vx + idleVx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + idleVy + springVy + pushVy) * PARTICLE_CFG.damping;

      p.x += p.vx;
      p.y += p.vy;

      drawRoundGlass(ctx, p.x, p.y, p.radius, p.palette);
    }

    rafId = requestAnimationFrame(tickParticles);
  }

  /**
   * Draw a spherical frosted glass disc / bead:
   * 1. Soft depth shadow casting on #FEFFED.
   * 2. 3D radial glass gradient with top-left specular highlight.
   * 3. Polished bevel rim stroke catching directional light.
   * 4. Crisp specular glint dot in the upper-left facet.
   */
  function drawRoundGlass(ctx, cx, cy, r, pal) {
    ctx.save();
    ctx.translate(cx, cy);

    // 1. Ambient depth shadow
    ctx.shadowColor   = pal.shadow;
    ctx.shadowBlur    = 4.5;
    ctx.shadowOffsetY = 1.3;

    // 2. Circular body path & radial glass refraction
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r);
    grad.addColorStop(0,    'rgba(255, 255, 255, 0.92)'); // top-left light catch
    grad.addColorStop(0.24, pal.highlight);               // translucent glass core
    grad.addColorStop(0.76, pal.mid);                     // rich jewel tone
    grad.addColorStop(1,    pal.deep);                    // deeper underbelly
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Polished bevel rim edge
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 0.85;

    const rimGrad = ctx.createLinearGradient(-r, -r, r, r);
    rimGrad.addColorStop(0,   'rgba(255, 255, 255, 0.95)');
    rimGrad.addColorStop(0.4, pal.rimLight);
    rimGrad.addColorStop(1,   pal.rimDark);
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // 4. Specular glint reflection
    if (r > 3.0) {
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, Math.max(0.6, r * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.fill();
    }

    ctx.restore();
  }

  // Pointer interaction (mouse + touch)
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse = {
      x: (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left,
      y: (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top,
    };
  }

  function onPointerLeave() {
    mouse = null;
  }

  window.addEventListener('pointermove',  onPointerMove,  { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('touchmove',    onPointerMove,  { passive: true });
  window.addEventListener('touchend',     onPointerLeave, { passive: true });

  // Pause when tab is not visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(tickParticles);
    }
  });

  // Responsive resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });

  resizeCanvas();
  rafId = requestAnimationFrame(tickParticles);
}


/* ═══════════════════════════════════════════════════════════════
   3.  STATIC TRADING WAVE (BIG CLEAN RIDGES)
   ═══════════════════════════════════════════════════════════════ */

function initWave() {

  const svg    = document.getElementById('wave-svg');
  const pathEl = document.getElementById('wave-path');
  const fillEl = document.getElementById('wave-fill');
  const dotEl  = document.getElementById('wave-dot');

  if (!svg || !pathEl || !fillEl || !dotEl) return;

  /**
   * Renders the static trading path and fill based on TRADE_POINTS.
   * Completely static — NO animation loop, NO ticker scrolling, NO draw-in.
   */
  function renderStaticWave() {
    const rect = svg.getBoundingClientRect();
    const svgW = rect.width  || svg.clientWidth  || 600;
    const svgH = rect.height || svg.clientHeight || 140;

    let pathD = '';
    const coords = TRADE_POINTS.map(pt => ({
      x: pt.x * svgW,
      y: pt.y * svgH,
    }));

    // Build the clean jagged stroke path with big ridges
    coords.forEach((c, i) => {
      pathD += i === 0
        ? `M ${c.x.toFixed(2)},${c.y.toFixed(2)} `
        : `L ${c.x.toFixed(2)},${c.y.toFixed(2)} `;
    });

    pathEl.setAttribute('d', pathD);

    // Build the soft gradient fill beneath the line
    const first = coords[0];
    const last  = coords[coords.length - 1];
    const fillD = `${pathD} L ${last.x.toFixed(2)},${svgH} L ${first.x.toFixed(2)},${svgH} Z`;
    fillEl.setAttribute('d', fillD);

    // Place the static latest-point dot with radius 5.5
    dotEl.setAttribute('cx', last.x.toFixed(2));
    dotEl.setAttribute('cy', last.y.toFixed(2));
    dotEl.setAttribute('r',  '5.5');
  }

  // Render on load and update coordinates on resize for perfect responsiveness
  renderStaticWave();

  let waveResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(waveResizeTimer);
    waveResizeTimer = setTimeout(renderStaticWave, 120);
  });
}


/* ═══════════════════════════════════════════════════════════════
   4.  INIT
   ═══════════════════════════════════════════════════════════════ */

function init() {
  initParticles();
  initWave();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
