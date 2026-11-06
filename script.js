/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & Colors (#20309A and #BB232B)
     2. initParticles() — small, delicate particles with soft,
                          slow, wavy, serene fluid movement.
                          Stays visible as long as mouse is present.
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
 * Particle visual & serene wavy fluid config.
 * - Really small delicate size (1.2px - 2.4px).
 * - Gentle, slow, wavy, smooth motion (never fast or jerky).
 * - Stays visible as long as the mouse is hovered (NO timeout).
 * - Discrete color flip: Blue becomes Red, Red becomes Blue on hover.
 */
const PARTICLE_CFG = {
  blueRatio      : 0.65,  // 65% Blue, 35% Red natively
  minRadius      : 1.2,   // px — delicate small size
  maxRadius      : 2.3,   // px
  elongation     : 1.55,  // streamlined elongation
  influenceRadius: 280,   // px — wake-up / illumination radius around cursor
  solidRadius    : 210,   // px — 100% full brightness zone
  pushRadius     : 180,   // px — gentle push & color-inversion radius
  pushStrength   : 2.2,   // gentle, slow push (never fast)
  swirlStrength  : 1.4,   // soft tangential wave flow
  maxSpeed       : 1.6,   // strict speed clamp for smooth, calm motion
  damping        : 0.93,  // high fluid viscosity (silky gliding)
  returnK        : 0.018, // very soft, gentle return to home
  fadeSpeed      : 0.09,  // smooth alpha transition
  targetDensity  : 1 / 1100, // fine-grained dense particle field
  minCount       : 500,
  maxCount       : 1100,
};

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rnd   = (min, max)  => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  SERENE WAVY PARTICLES (HOVER WAKE & DISCRETE COLOR FLIP)
   ═══════════════════════════════════════════════════════════════ */

function initParticles() {

  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let   dpr    = window.devicePixelRatio || 1;

  let W = 0, H = 0;
  let particles = [];

  /** Mouse state tracking (stays active as long as pointer is on page) */
  let mouse = {
    x     : -9999,
    y     : -9999,
    vx    : 0,
    vy    : 0,
    active: false, // true while pointer is inside the window
  };

  /**
   * One particle starting at alpha = 0 (clean white canvas on idle).
   */
  function makeParticle(x, y) {
    const isBlue = Math.random() < PARTICLE_CFG.blueRatio;
    return {
      hx      : x,
      hy      : y,
      x       : x,
      y       : y,
      vx      : 0,
      vy      : 0,
      angle   : rnd(0, Math.PI * 2),
      radius  : rnd(PARTICLE_CFG.minRadius, PARTICLE_CFG.maxRadius),
      isBlue  : isBlue,
      swirlDir: Math.random() < 0.5 ? 1 : -1,
      phase   : rnd(0, Math.PI * 2),
      waveFreq: rnd(0.015, 0.030), // subtle unique wave frequency
      alpha   : 0,                 // starts invisible
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

  let rafId      = null;
  let frameCount = 0;

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);
    frameCount++;
    const time = frameCount * 0.02;

    // Smoothly decay mouse inertia
    mouse.vx *= 0.88;
    mouse.vy *= 0.88;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Very soft, gentle spring pulling back to home position
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      let pushVx      = 0;
      let pushVy      = 0;
      let targetAlpha = 0;
      let isHovered   = false;

      // Stays active as long as the mouse is inside the window (NO arbitrary timeout)
      if (mouse.active) {
        const dx   = p.x - mouse.x;
        const dy   = p.y - mouse.y;
        const d2   = dx * dx + dy * dy;
        const infR = PARTICLE_CFG.influenceRadius;

        if (d2 < infR * infR) {
          const d = Math.sqrt(d2);

          // Solid, bright opacity across active zone
          if (d <= PARTICLE_CFG.solidRadius) {
            targetAlpha = 1.0;
          } else {
            targetAlpha = (infR - d) / (infR - PARTICLE_CFG.solidRadius);
          }

          // Gentle wavy fluid interaction zone
          const pushR = PARTICLE_CFG.pushRadius;
          if (d < pushR) {
            isHovered = true; // Inverts color: Blue <-> Red

            // Smooth cosine curve for gentle, non-violent repulsion
            const factor = Math.sin((1 - d / pushR) * Math.PI * 0.5);
            const safeD  = Math.max(d, 0.001);

            // 1. Slow, gentle radial expansion
            const rForce = factor * PARTICLE_CFG.pushStrength;
            const nx = dx / safeD;
            const ny = dy / safeD;

            // 2. Soft tangential wave curl
            const sForce = factor * PARTICLE_CFG.swirlStrength * p.swirlDir;
            const tx = -ny;
            const ty = nx;

            // 3. Gentle drag from mouse motion
            const drag = factor * 0.45;

            // 4. Soft continuous wave undulation while hovering
            const waveX = Math.sin(p.phase + time + p.hx * 0.015) * 0.4 * factor;
            const waveY = Math.cos(p.phase + time + p.hy * 0.015) * 0.4 * factor;

            pushVx = nx * rForce + tx * sForce + mouse.vx * drag + waveX;
            pushVy = ny * rForce + ty * sForce + mouse.vy * drag + waveY;
          }
        }
      }

      // Smooth alpha transition
      p.alpha += (targetAlpha - p.alpha) * PARTICLE_CFG.fadeSpeed;

      // Apply forces with viscous fluid damping
      p.vx = (p.vx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + springVy + pushVy) * PARTICLE_CFG.damping;

      // Strict speed clamp so particles never move fast
      const currentSpeed = Math.hypot(p.vx, p.vy);
      if (currentSpeed > PARTICLE_CFG.maxSpeed) {
        const scale = PARTICLE_CFG.maxSpeed / currentSpeed;
        p.vx *= scale;
        p.vy *= scale;
      }

      p.x += p.vx;
      p.y += p.vy;

      // Orient elongated streamline along smooth velocity heading
      if (currentSpeed > 0.03) {
        p.angle = Math.atan2(p.vy, p.vx);
      }

      // Discrete color flip: Blue -> Red, Red -> Blue on hover
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
   * Draw a small, crisp, flat particle:
   * - Tiny size (rx ~ 1.9px - 3.6px, ry ~ 1.1px - 2.1px).
   * - Pure solid color in either #20309A or #BB232B.
   */
  function drawBrightParticle(ctx, cx, cy, r, angle, color, alpha) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const rx = r * PARTICLE_CFG.elongation;
    const ry = r * 0.92;

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);

    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.fillStyle   = color;
    ctx.fill();

    ctx.restore();
  }

  // Pointer interaction
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const newX = (e.clientX ?? e.touches?.[0]?.clientX ?? 0) - rect.left;
    const newY = (e.clientY ?? e.touches?.[0]?.clientY ?? 0) - rect.top;

    if (mouse.active) {
      mouse.vx = (newX - mouse.x) * 0.25;
      mouse.vy = (newY - mouse.y) * 0.25;
    }

    mouse.x = newX;
    mouse.y = newY;
    mouse.active = true;
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
