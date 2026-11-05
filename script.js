/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & Color definitions (#20309A and #BB232B)
     2. initParticles() — hover-activated, bright solid particles
                          with discrete Blue <-> Red color flip on hover
     3. init()          — bootstrap
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & COLORS
   ═══════════════════════════════════════════════════════════════ */

const COLOR = {
  white: '#FFFFFF',
  blue : '#20309A',
  red  : '#BB232B',
};

/**
 * Particle visual & interaction config.
 * - Flat, solid, fully opaque color — zero glass, zero milky haze.
 * - Tiny teeny elongation (1.35x) oriented along motion.
 * - Discrete flip: Blue becomes Red, Red becomes Blue on hover.
 * - Fully bright (alpha = 1.0) throughout the active cursor zone.
 */
const PARTICLE_CFG = {
  blueRatio      : 0.65,  // 65% Blue, 35% Red natively
  minRadius      : 3.2,   // px
  maxRadius      : 6.2,   // px
  elongation     : 1.35,  // tiny teeny elongation (rx = r * 1.35, ry = r * 0.95)
  influenceRadius: 280,   // px — wake-up illumination radius around cursor
  solidRadius    : 220,   // px — full 100% solid opacity zone (maximum brightness)
  pushRadius     : 180,   // px — physical repulsion & color-inversion radius
  pushStrength   : 7.8,   // peak repulsion acceleration
  damping        : 0.86,  // velocity friction
  returnK        : 0.045, // spring return constant
  fadeSpeed      : 0.12,  // fast, responsive wake-up
  idleTimeoutMs  : 1600,  // fade back to blank when mouse stops moving
  targetDensity  : 1 / 1800,
  minCount       : 320,
  maxCount       : 750,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (min, max)  => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  BRIGHT PARTICLES (HOVER WAKE & DISCRETE COLOR FLIP)
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
   * One particle starting at alpha = 0 (clean white canvas on idle).
   */
  function makeParticle(x, y) {
    const isBlue = Math.random() < PARTICLE_CFG.blueRatio;
    return {
      hx    : x,
      hy    : y,
      x     : x,
      y     : y,
      vx    : 0,
      vy    : 0,
      angle : rnd(0, Math.PI * 2),
      radius: rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      isBlue: isBlue,
      alpha : 0, // starts invisible
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
    const isMouseAlive = mouse.active && (now - mouse.lastMove < PARTICLE_CFG.idleTimeoutMs);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Spring toward resting home anchor
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      let pushVx      = 0;
      let pushVy      = 0;
      let targetAlpha = 0;
      let isHovered   = false;

      if (isMouseAlive) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const infR = PARTICLE_CFG.influenceRadius;

        if (d2 < infR * infR) {
          const d = Math.sqrt(d2);

          // Full, bright, solid opacity across the active zone (no milky washout)
          if (d <= PARTICLE_CFG.solidRadius) {
            targetAlpha = 1.0;
          } else {
            // Crisp falloff at the outer perimeter
            targetAlpha = (infR - d) / (infR - PARTICLE_CFG.solidRadius);
          }

          // Inversion zone & physical repulsion
          const pushR = PARTICLE_CFG.pushRadius;
          if (d < pushR) {
            isHovered = true; // Flips to opposite color
            const factor = (1 - d / pushR);
            const force  = factor * factor * PARTICLE_CFG.pushStrength;
            const safeD  = Math.max(d, 0.001);
            pushVx = (dx / safeD) * force;
            pushVy = (dy / safeD) * force;
          }
        }
      }

      // Smooth alpha transition
      p.alpha += (targetAlpha - p.alpha) * PARTICLE_CFG.fadeSpeed;

      // Integrate velocity and position
      p.vx = (p.vx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + springVy + pushVy) * PARTICLE_CFG.damping;

      p.x += p.vx;
      p.y += p.vy;

      // Update orientation heading along motion
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.05) {
        p.angle = Math.atan2(p.vy, p.vx);
      }

      // Color flip: Blue -> Red, Red -> Blue when hovered near cursor
      let color;
      if (p.isBlue) {
        color = isHovered ? COLOR.red : COLOR.blue;
      } else {
        color = isHovered ? COLOR.blue : COLOR.red;
      }

      // Draw only if visible
      if (p.alpha > 0.02) {
        drawBrightParticle(ctx, p.x, p.y, p.radius, p.angle, color, p.alpha);
      }
    }

    rafId = requestAnimationFrame(tickParticles);
  }

  /**
   * Draw a flat, solid, bright particle:
   * - ZERO glass effect, zero cloudy white gradients, zero shadows.
   * - Crisp solid fill in either #20309A or #BB232B.
   * - Tiny teeny elongation along motion angle.
   */
  function drawBrightParticle(ctx, cx, cy, r, angle, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const rx = r * PARTICLE_CFG.elongation; // slightly elongated
    const ry = r * 0.95;

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

    // Solid, vibrant pigment
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.fillStyle   = color;
    ctx.fill();

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
