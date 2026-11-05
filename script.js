/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & 2-color palettes (Espresso & Charcoal)
     2. initParticles() — interactive hover-activated round glass particles
     3. initWave()      — clean static trading line (pure stroke, no shade)
     4. init()          — bootstrap
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & COLOR PALETTES
   ═══════════════════════════════════════════════════════════════ */

const COLOR = {
  cream: '#FAF8F5',
  blue : '#20309A',
  red  : '#BB232B',
};

/**
 * 2-Color Palettes for Round Glass Particles:
 *   1. Deep Espresso / Dark Chocolate Brown
 *   2. Charcoal / Slate Grey
 * (Olive Green & Mustard Yellow removed as requested)
 */
const PARTICLE_PALETTES = [
  // 1. Deep Espresso / Dark Chocolate Brown
  {
    name     : 'espresso',
    highlight: [130, 88, 62],
    mid      : [58, 34, 22],
    deep     : [32, 18, 10],
    rimLight : [160, 115, 88],
    rimDark  : [32, 18, 10],
    shadow   : [32, 18, 10],
  },
  // 2. Charcoal / Slate Grey
  {
    name     : 'charcoal',
    highlight: [130, 142, 155],
    mid      : [52, 61, 70],
    deep     : [30, 36, 42],
    rimLight : [165, 178, 192],
    rimDark  : [30, 36, 42],
    shadow   : [30, 36, 42],
  },
];

/**
 * Particle visual & physics config.
 * Hover-activated: blank canvas by default; wakes up dynamically
 * when the cursor moves across, matching the Google Antigravity hero.
 */
const PARTICLE_CFG = {
  minRadius      : 2.8,   // px
  maxRadius      : 5.8,   // px
  influenceRadius: 280,   // px — wake-up / illumination radius around cursor
  pushRadius     : 180,   // px — physical repulsion radius
  pushStrength   : 7.5,   // peak repulsion acceleration
  damping        : 0.85,  // velocity friction
  returnK        : 0.045, // elastic spring return to home anchor
  fadeSpeed      : 0.08,  // alpha interpolation speed
  idleTimeoutMs  : 1600,  // fade back to blank when mouse stops moving
  targetDensity  : 1 / 1800, // grid density across viewport
  minCount       : 320,
  maxCount       : 750,
};

/**
 * Static trading line normalized points (0.0 to 1.0).
 * Big, bold, clean price ridges with an overall upward trend.
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

const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (min, max) => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  ROUND GLASS PARTICLES (HOVER-ACTIVATED)
   ═══════════════════════════════════════════════════════════════ */

function initParticles() {

  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let   dpr    = window.devicePixelRatio || 1;

  let W = 0, H = 0;
  let particles = [];

  /** Mouse state tracking */
  let mouse = {
    x       : -9999,
    y       : -9999,
    active  : false,
    lastMove: 0,
  };

  /**
   * One particle starting at alpha = 0 (blank cream canvas by default).
   */
  function makeParticle(x, y) {
    const palIndex = Math.floor(Math.random() * PARTICLE_PALETTES.length);
    return {
      hx      : x,
      hy      : y,
      x       : x,
      y       : y,
      vx      : 0,
      vy      : 0,
      radius  : rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      palette : PARTICLE_PALETTES[palIndex],
      alpha   : 0, // starts completely invisible
    };
  }

  function buildParticles() {
    const area  = W * H;
    const count = clamp(
      Math.round(area * PARTICLE_CFG.targetDensity),
      PARTICLE_CFG.minCount,
      PARTICLE_CFG.maxCount,
    );

    particles = [];
    const cols = Math.ceil(Math.sqrt(count * (W / H)));
    const rows = Math.ceil(count / cols);

    for (let i = 0; i < count; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x   = (col + 0.5 + rnd(-0.4, 0.4)) * (W / cols);
      const y   = (row + 0.5 + rnd(-0.4, 0.4)) * (H / rows);
      particles.push(makeParticle(x, y));
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

  let rafId = null;

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);

    const now = performance.now();
    // Inactive if mouse stopped moving or went off-screen
    const isMouseAlive = mouse.active && (now - mouse.lastMove < PARTICLE_CFG.idleTimeoutMs);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Spring toward home anchor
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      let pushVx = 0;
      let pushVy = 0;
      let targetAlpha = 0;

      if (isMouseAlive) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const infR = PARTICLE_CFG.influenceRadius;

        if (d2 < infR * infR) {
          const d = Math.sqrt(d2);

          // Alpha reveals around cursor with a smooth radial falloff
          const normD = d / infR;
          targetAlpha = Math.pow(1 - normD, 1.4);

          // Outward radial repulsion
          const pushR = PARTICLE_CFG.pushRadius;
          if (d < pushR) {
            const factor = (1 - d / pushR);
            const force  = factor * factor * PARTICLE_CFG.pushStrength;
            const safeD  = Math.max(d, 0.001);
            pushVx = (dx / safeD) * force;
            pushVy = (dy / safeD) * force;
          }
        }
      }

      // Smoothly interpolate alpha (reveals when hovered, dissolves back to blank)
      p.alpha += (targetAlpha - p.alpha) * PARTICLE_CFG.fadeSpeed;

      // Integrate velocity and position
      p.vx = (p.vx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + springVy + pushVy) * PARTICLE_CFG.damping;

      p.x += p.vx;
      p.y += p.vy;

      // Draw only if visible (keeps canvas blank otherwise)
      if (p.alpha > 0.01) {
        drawRoundGlass(ctx, p.x, p.y, p.radius, p.palette, p.alpha);
      }
    }

    rafId = requestAnimationFrame(tickParticles);
  }

  /**
   * Draw a spherical frosted glass bead with alpha scaling.
   */
  function drawRoundGlass(ctx, cx, cy, r, pal, alpha) {
    ctx.save();
    ctx.translate(cx, cy);

    const a = clamp(alpha, 0, 1);

    // 1. Soft depth shadow
    const sh = pal.shadow;
    ctx.shadowColor   = `rgba(${sh[0]}, ${sh[1]}, ${sh[2]}, ${(0.22 * a).toFixed(3)})`;
    ctx.shadowBlur    = 4.5 * a;
    ctx.shadowOffsetY = 1.3;

    // 2. Circular body path & 3D radial glass refraction
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r);
    const hl = pal.highlight;
    const md = pal.mid;
    const dp = pal.deep;

    grad.addColorStop(0,    `rgba(255, 255, 255, ${(0.92 * a).toFixed(3)})`);
    grad.addColorStop(0.24, `rgba(${hl[0]}, ${hl[1]}, ${hl[2]}, ${(0.55 * a).toFixed(3)})`);
    grad.addColorStop(0.76, `rgba(${md[0]}, ${md[1]}, ${md[2]}, ${(0.75 * a).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${dp[0]}, ${dp[1]}, ${dp[2]}, ${(0.90 * a).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Polished bevel rim edge
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 0.85;

    const rimGrad = ctx.createLinearGradient(-r, -r, r, r);
    const rl = pal.rimLight;
    const rd = pal.rimDark;
    rimGrad.addColorStop(0,   `rgba(255, 255, 255, ${(0.95 * a).toFixed(3)})`);
    rimGrad.addColorStop(0.4, `rgba(${rl[0]}, ${rl[1]}, ${rl[2]}, ${(0.80 * a).toFixed(3)})`);
    rimGrad.addColorStop(1,   `rgba(${rd[0]}, ${rd[1]}, ${rd[2]}, ${(0.52 * a).toFixed(3)})`);
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // 4. Specular glint reflection
    if (r > 3.0) {
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, Math.max(0.6, r * 0.2), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.88 * a).toFixed(3)})`;
      ctx.fill();
    }

    ctx.restore();
  }

  // Pointer interaction
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    mouse.y = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;
    mouse.active = true;
    mouse.lastMove = performance.now();
  }

  function onPointerLeave() {
    mouse.active = false;
  }

  window.addEventListener('pointermove',  onPointerMove,  { passive: true });
  window.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('touchmove',    onPointerMove,  { passive: true });
  window.addEventListener('touchend',     onPointerLeave, { passive: true });

  // Pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(tickParticles);
    }
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });

  resizeCanvas();
  rafId = requestAnimationFrame(tickParticles);
}


/* ═══════════════════════════════════════════════════════════════
   3.  STATIC TRADING LINE (PURE STROKE — NO SHADE/FILL)
   ═══════════════════════════════════════════════════════════════ */

function initWave() {

  const svg    = document.getElementById('wave-svg');
  const pathEl = document.getElementById('wave-path');
  const dotEl  = document.getElementById('wave-dot');

  if (!svg || !pathEl || !dotEl) return;

  /**
   * Renders the static trading stroke with big, clear ridges.
   * Completely static: pure stroke line + endpoint dot with NO fill/shade downward.
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

    // Build the clean jagged stroke path
    coords.forEach((c, i) => {
      pathD += i === 0
        ? `M ${c.x.toFixed(2)},${c.y.toFixed(2)} `
        : `L ${c.x.toFixed(2)},${c.y.toFixed(2)} `;
    });

    pathEl.setAttribute('d', pathD);

    // Place the static latest-point dot
    const last = coords[coords.length - 1];
    dotEl.setAttribute('cx', last.x.toFixed(2));
    dotEl.setAttribute('cy', last.y.toFixed(2));
    dotEl.setAttribute('r',  '5.5');
  }

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
