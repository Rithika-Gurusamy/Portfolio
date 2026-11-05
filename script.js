/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & Blue/Red Color Palettes
     2. initParticles() — hover-activated round glass particles
     3. init()          — bootstrap
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & COLOR PALETTES
   ═══════════════════════════════════════════════════════════════ */

const COLOR = {
  white: '#FFFFFF',
  blue : '#20309A',
  red  : '#BB232B',
};

/**
 * Vibrant Blue & Red Glass Palettes:
 *   1. Electric Sapphire Blue  (#20309A)
 *   2. Vivid Ruby Red          (#BB232B)
 * Highly visible, saturated, and punchy against #FFFFFF.
 */
const PARTICLE_PALETTES = {
  blue: {
    name     : 'blue',
    highlight: [110, 145, 255],
    mid      : [32, 48, 154],
    deep     : [16, 26, 110],
    rimLight : [150, 185, 255],
    rimDark  : [20, 32, 130],
    shadow   : [32, 48, 154],
  },
  red: {
    name     : 'red',
    highlight: [245, 95, 105],
    mid      : [187, 35, 43],
    deep     : [125, 18, 25],
    rimLight : [255, 140, 150],
    rimDark  : [130, 20, 28],
    shadow   : [187, 35, 43],
  },
};

/**
 * Particle visual & physics config.
 * Blank canvas by default; wakes up into a vibrant Blue & Red field
 * on mouse hover matching the Google Antigravity hero.
 */
const PARTICLE_CFG = {
  blueRatio      : 0.65,  // 65% blue, 35% red
  minRadius      : 3.2,   // px
  maxRadius      : 6.8,   // px
  influenceRadius: 290,   // px — wake-up / illumination radius around cursor
  pushRadius     : 185,   // px — physical repulsion radius
  pushStrength   : 7.8,   // peak repulsion acceleration
  damping        : 0.85,  // velocity friction
  returnK        : 0.045, // elastic spring return to home anchor
  fadeSpeed      : 0.08,  // alpha interpolation speed
  idleTimeoutMs  : 1600,  // fade back to blank when mouse stops moving
  targetDensity  : 1 / 1800, // grid density across viewport
  minCount       : 320,
  maxCount       : 750,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (min, max) => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  ROUND GLASS PARTICLES (HOVER-ACTIVATED BLUE & RED)
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
   * One particle starting at alpha = 0 (clean white canvas by default).
   */
  function makeParticle(x, y) {
    const isBlue  = Math.random() < PARTICLE_CFG.blueRatio;
    const palette = isBlue ? PARTICLE_PALETTES.blue : PARTICLE_PALETTES.red;

    return {
      hx      : x,
      hy      : y,
      x       : x,
      y       : y,
      vx      : 0,
      vy      : 0,
      radius  : rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      palette : palette,
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
    // Inactive if mouse stopped moving or left window
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
          targetAlpha = Math.pow(1 - normD, 1.3);

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
   * Draw a spherical frosted glass bead in vibrant Blue or Red.
   */
  function drawRoundGlass(ctx, cx, cy, r, pal, alpha) {
    ctx.save();
    ctx.translate(cx, cy);

    const a = clamp(alpha, 0, 1);

    // 1. Soft depth shadow on pure white
    const sh = pal.shadow;
    ctx.shadowColor   = `rgba(${sh[0]}, ${sh[1]}, ${sh[2]}, ${(0.28 * a).toFixed(3)})`;
    ctx.shadowBlur    = 5.0 * a;
    ctx.shadowOffsetY = 1.4;

    // 2. Circular body path & 3D radial glass refraction
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);

    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.08, 0, 0, r);
    const hl = pal.highlight;
    const md = pal.mid;
    const dp = pal.deep;

    grad.addColorStop(0,    `rgba(255, 255, 255, ${(0.95 * a).toFixed(3)})`);
    grad.addColorStop(0.24, `rgba(${hl[0]}, ${hl[1]}, ${hl[2]}, ${(0.65 * a).toFixed(3)})`);
    grad.addColorStop(0.76, `rgba(${md[0]}, ${md[1]}, ${md[2]}, ${(0.88 * a).toFixed(3)})`);
    grad.addColorStop(1,    `rgba(${dp[0]}, ${dp[1]}, ${dp[2]}, ${(0.96 * a).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Polished bevel rim edge
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 0.95;

    const rimGrad = ctx.createLinearGradient(-r, -r, r, r);
    const rl = pal.rimLight;
    const rd = pal.rimDark;
    rimGrad.addColorStop(0,   `rgba(255, 255, 255, ${(0.95 * a).toFixed(3)})`);
    rimGrad.addColorStop(0.4, `rgba(${rl[0]}, ${rl[1]}, ${rl[2]}, ${(0.85 * a).toFixed(3)})`);
    rimGrad.addColorStop(1,   `rgba(${rd[0]}, ${rd[1]}, ${rd[2]}, ${(0.60 * a).toFixed(3)})`);
    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // 4. Specular glint reflection
    if (r > 3.0) {
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, Math.max(0.7, r * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${(0.92 * a).toFixed(3)})`;
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
   3.  INIT
   ═══════════════════════════════════════════════════════════════ */

function init() {
  initParticles();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
