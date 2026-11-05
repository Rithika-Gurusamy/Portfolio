/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & RGB color definitions
     2. initParticles() — hover-activated slightly elongated bubbles
                          with live opposite-color shift on proximity
     3. init()          — bootstrap
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & RGB COLORS
   ═══════════════════════════════════════════════════════════════ */

/** Pure vibrant primary colors */
const COLOR_BLUE_RGB = [32, 48, 154];  // #20309A
const COLOR_RED_RGB  = [187, 35, 43];  // #BB232B

/**
 * Bubble visual & interaction config.
 * - Slightly elongated (1.32x aspect ratio) oriented along motion.
 * - Inverts to the opposite color when hovered.
 * - Bright, saturated bubble body without milky white washout.
 */
const PARTICLE_CFG = {
  blueRatio      : 0.65,  // 65% Blue, 35% Red
  minRadius      : 3.2,   // px
  maxRadius      : 6.8,   // px
  elongation     : 1.32,  // tiny teeny elongation ratio (rx = r * 1.32, ry = r * 0.92)
  influenceRadius: 290,   // px — wake-up / illumination radius around cursor
  pushRadius     : 185,   // px — physical repulsion & color-inversion radius
  pushStrength   : 7.8,   // peak repulsion acceleration
  damping        : 0.86,  // velocity friction
  returnK        : 0.045, // spring return constant
  fadeSpeed      : 0.08,  // alpha transition speed
  colorShiftSpeed: 0.16,  // color inversion transition speed
  idleTimeoutMs  : 1600,  // fade back to blank when mouse stops moving
  targetDensity  : 1 / 1800,
  minCount       : 320,
  maxCount       : 750,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp  = (a, b, t)   => a + (b - a) * t;
const rnd   = (min, max)  => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  BUBBLE PARTICLES (HOVER WAKE & COLOR INVERSION)
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
   * Create one bubble with native color and color-shift tracker.
   */
  function makeParticle(x, y) {
    const isBlue = Math.random() < PARTICLE_CFG.blueRatio;
    return {
      hx        : x,
      hy        : y,
      x         : x,
      y         : y,
      vx        : 0,
      vy        : 0,
      angle     : rnd(0, Math.PI * 2),
      radius    : rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      isBlue    : isBlue,
      colorShift: 0, // 0 = native color, 1 = inverted opposite color
      alpha     : 0, // starts invisible (blank canvas by default)
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

      // Spring toward home anchor
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      let pushVx      = 0;
      let pushVy      = 0;
      let targetAlpha = 0;
      let targetShift = 0;

      if (isMouseAlive) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const infR = PARTICLE_CFG.influenceRadius;

        if (d2 < infR * infR) {
          const d = Math.sqrt(d2);

          // Reveal around cursor with smooth radial falloff
          const normD = d / infR;
          targetAlpha = Math.pow(1 - normD, 1.3);

          // Proximity to cursor triggers opposite-color shift & repulsion
          const pushR = PARTICLE_CFG.pushRadius;
          if (d < pushR) {
            const factor = (1 - d / pushR);
            // Invert toward opposite color smoothly
            targetShift = Math.pow(factor, 0.85);

            // Outward repulsion
            const force = factor * factor * PARTICLE_CFG.pushStrength;
            const safeD = Math.max(d, 0.001);
            pushVx = (dx / safeD) * force;
            pushVy = (dy / safeD) * force;
          }
        }
      }

      // Smooth alpha interpolation (wake up on hover, dissolve to blank)
      p.alpha += (targetAlpha - p.alpha) * PARTICLE_CFG.fadeSpeed;

      // Smooth color shift interpolation (shifts to opposite color on hover)
      p.colorShift += (targetShift - p.colorShift) * PARTICLE_CFG.colorShiftSpeed;

      // Integrate velocity and position
      p.vx = (p.vx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + springVy + pushVy) * PARTICLE_CFG.damping;

      p.x += p.vx;
      p.y += p.vy;

      // Update elongation heading angle along motion
      const speed = Math.hypot(p.vx, p.vy);
      if (speed > 0.04) {
        p.angle = Math.atan2(p.vy, p.vx);
      }

      // Calculate current interpolated RGB (Blue inverts to Red, Red inverts to Blue)
      let cr, cg, cb;
      if (p.isBlue) {
        // Native: Blue [32, 48, 154] -> Inverted: Red [187, 35, 43]
        cr = Math.round(lerp(COLOR_BLUE_RGB[0], COLOR_RED_RGB[0], p.colorShift));
        cg = Math.round(lerp(COLOR_BLUE_RGB[1], COLOR_RED_RGB[1], p.colorShift));
        cb = Math.round(lerp(COLOR_BLUE_RGB[2], COLOR_RED_RGB[2], p.colorShift));
      } else {
        // Native: Red [187, 35, 43] -> Inverted: Blue [32, 48, 154]
        cr = Math.round(lerp(COLOR_RED_RGB[0], COLOR_BLUE_RGB[0], p.colorShift));
        cg = Math.round(lerp(COLOR_RED_RGB[1], COLOR_BLUE_RGB[1], p.colorShift));
        cb = Math.round(lerp(COLOR_RED_RGB[2], COLOR_BLUE_RGB[2], p.colorShift));
      }

      // Draw bubble if visible
      if (p.alpha > 0.01) {
        drawBubble(ctx, p.x, p.y, p.radius, p.angle, cr, cg, cb, p.alpha);
      }
    }

    rafId = requestAnimationFrame(tickParticles);
  }

  /**
   * Draw a bright, punchy, slightly elongated bubble:
   * - Tiny teeny elongation along motion angle.
   * - Rich saturated pigment (no milky white washout).
   * - Clean crisp bubble rim.
   * - Tiny specular glint reflection dot.
   */
  function drawBubble(ctx, cx, cy, r, angle, cr, cg, cb, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const a = clamp(alpha, 0, 1);
    const rx = r * PARTICLE_CFG.elongation; // slightly elongated
    const ry = r * 0.92;

    // 1. Subtle, vibrant tinted aura
    ctx.shadowColor   = `rgba(${cr}, ${cg}, ${cb}, ${(0.32 * a).toFixed(3)})`;
    ctx.shadowBlur    = 4.5 * a;
    ctx.shadowOffsetY = 0.5;

    // 2. Slightly elongated bubble geometry
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

    // 3. Bright, punchy, saturated bubble fill (NOT washed out with white)
    const grad = ctx.createRadialGradient(-rx * 0.25, -ry * 0.25, r * 0.08, 0, 0, rx);
    const brightR = Math.min(255, Math.round(cr * 1.25 + 24));
    const brightG = Math.min(255, Math.round(cg * 1.25 + 24));
    const brightB = Math.min(255, Math.round(cb * 1.25 + 24));

    grad.addColorStop(0,   `rgba(${brightR}, ${brightG}, ${brightB}, ${(0.94 * a).toFixed(3)})`);
    grad.addColorStop(0.55, `rgba(${cr}, ${cg}, ${cb}, ${(0.86 * a).toFixed(3)})`);
    grad.addColorStop(1,   `rgba(${Math.round(cr * 0.85)}, ${Math.round(cg * 0.85)}, ${Math.round(cb * 0.85)}, ${(0.92 * a).toFixed(3)})`);

    ctx.fillStyle = grad;
    ctx.fill();

    // 4. Crisp bubble perimeter stroke
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.lineWidth   = 0.95;
    ctx.strokeStyle = `rgba(${cr}, ${cg}, ${cb}, ${(0.96 * a).toFixed(3)})`;
    ctx.stroke();

    // 5. Crisp specular glint reflection dot
    if (r > 3.0) {
      ctx.beginPath();
      ctx.arc(-rx * 0.42, -ry * 0.42, Math.max(0.65, r * 0.22), 0, Math.PI * 2);
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
