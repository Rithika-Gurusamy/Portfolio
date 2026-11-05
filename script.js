/* ═══════════════════════════════════════════════════════════════
   script.js — Portfolio UI Shell
   Sections:
     1. Constants & helpers
     2. initParticles()   — canvas floating glass particles
     3. initWave()        — SVG live trading wave
     4. init()            — bootstrap everything
   ═══════════════════════════════════════════════════════════════ */

'use strict';

/* ═══════════════════════════════════════════════════════════════
   1.  CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════ */

/** Color palette — mirrors CSS variables. */
const COLOR = {
  cream: '#FAF8F5',
  blue : '#20309A',
  red  : '#BB232B',
};

/**
 * Particle visual config — Glass Effect.
 * ─ blueRatio    : fraction that are blue (rest are ruby red)
 * ─ minLength    : capsule half-length in px (at 1× DPR)
 * ─ maxLength    : capsule half-length max
 * ─ thickness    : capsule half-thickness
 */
const PARTICLE_CFG = {
  blueRatio    : 0.65,
  minLength    : 3.8,      // half-length (7.6px min total length)
  maxLength    : 7.2,      // half-length (14.4px max total length)
  thickness    : 2.2,      // half-thickness (4.4px wide for glass body)
  alpha        : 0.95,
  speed        : 0.45,     // idle drift speed (px/frame at 60fps)
  waveFreq     : 0.012,    // sine wave frequency for organic drift
  waveAmp      : 0.6,      // amplitude of sine offset on idle velocity
  mouseRadius  : 175,      // px — push radius around cursor
  pushStrength : 6.8,      // force multiplier at centre of push radius
  damping      : 0.88,     // velocity damping per frame (< 1 = friction)
  returnK      : 0.045,    // spring constant pulling back to home position
  targetDensity: 1 / 2400, // particles per px² of screen area
  minCount     : 280,
  maxCount     : 600,
};

/** Wave visual / animation config. */
const WAVE_CFG = {
  scrollSpeed  : 0.6,     // px/frame the history scrolls left
  newPointRate : 2,       // frames between new point generation
  historyLen   : 220,     // how many points to keep in the rolling window
  drawInFrames : 90,      // frames for the initial draw-in (stroke-dashoffset)
  baseY        : 0.52,    // vertical centre of the wave (0=top, 1=bottom of SVG)
  trendSlope   : -0.0012, // how steeply the trend rises per point (negative = up in SVG)
  noiseMag     : 0.09,    // random noise magnitude relative to SVG height
  jaggedness   : 0.65,    // how sharp the jagged peaks are
  smoothPasses : 1,       // smoothing passes on new points
};

/** True if the user prefers reduced motion. */
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Linear interpolation */
const lerp = (a, b, t) => a + (b - a) * t;

/** Clamp a value between lo and hi */
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** Returns a random float in [min, max) */
const rnd = (min, max) => Math.random() * (max - min) + min;


/* ═══════════════════════════════════════════════════════════════
   2.  FLOATING GLASS PARTICLES
   ═══════════════════════════════════════════════════════════════ */

function initParticles() {

  // ── Canvas setup ──────────────────────────────────────────────
  const canvas = document.getElementById('particle-canvas');
  const ctx    = canvas.getContext('2d');
  let   dpr    = window.devicePixelRatio || 1;

  /** Physical (CSS) dimensions */
  let W = 0, H = 0;

  /** Current mouse / touch position in CSS px (or null when off-screen) */
  let mouse = null;

  // ── Particle state ────────────────────────────────────────────
  let particles = [];

  /**
   * One particle:
   *   hx, hy      — home (resting) position in CSS px
   *   x,  y       — current position
   *   vx, vy      — velocity
   *   phase       — phase offset for the sine-drift
   *   isBlue      — true if sapphire blue glass, false if ruby red glass
   *   len         — half-length of the capsule shape
   *   angle       — current draw angle (follows velocity)
   */
  function makeParticle(x, y) {
    const isBlue = Math.random() < PARTICLE_CFG.blueRatio;
    return {
      hx    : x,
      hy    : y,
      x     : x,
      y     : y,
      vx    : rnd(-0.4, 0.4),
      vy    : rnd(-0.4, 0.4),
      phase : rnd(0, Math.PI * 2),
      isBlue: isBlue,
      len   : rnd(PARTICLE_CFG.minLength, PARTICLE_CFG.maxLength),
      angle : rnd(0, Math.PI * 2),
    };
  }

  /** Rebuild the particle array for the current viewport size */
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

  /** Resize the canvas to fill the viewport at the device's pixel ratio */
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

  // ── Animation loop ────────────────────────────────────────────
  let frameCount = 0;
  let rafId      = null;

  function tickParticles() {
    ctx.clearRect(0, 0, W, H);

    frameCount++;
    const t = frameCount * 0.016; // approx time in seconds

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      if (REDUCED_MOTION) {
        // No motion — draw static at home position
        drawGlassCapsule(ctx, p.hx, p.hy, p.angle, p.len, p.isBlue);
        continue;
      }

      // ── Idle sine drift ──────────────────────────────────────
      const driftAngle = p.phase + t * PARTICLE_CFG.speed;
      const idleVx = Math.cos(driftAngle) * PARTICLE_CFG.waveAmp * PARTICLE_CFG.speed;
      const idleVy = Math.sin(driftAngle * PARTICLE_CFG.waveFreq * 60) * PARTICLE_CFG.waveAmp * PARTICLE_CFG.speed;

      // ── Spring toward home ───────────────────────────────────
      const springVx = (p.hx - p.x) * PARTICLE_CFG.returnK;
      const springVy = (p.hy - p.y) * PARTICLE_CFG.returnK;

      // ── Mouse repulsion ──────────────────────────────────────
      let pushVx = 0, pushVy = 0;
      if (mouse) {
        const dx  = p.x - mouse.x;
        const dy  = p.y - mouse.y;
        const d2  = dx * dx + dy * dy;
        const r   = PARTICLE_CFG.mouseRadius;
        if (d2 < r * r && d2 > 0.001) {
          const d      = Math.sqrt(d2);
          const factor = (1 - d / r);
          const force  = factor * factor * PARTICLE_CFG.pushStrength;
          pushVx = (dx / d) * force;
          pushVy = (dy / d) * force;
        }
      }

      // ── Integrate velocity ───────────────────────────────────
      p.vx = (p.vx + idleVx + springVx + pushVx) * PARTICLE_CFG.damping;
      p.vy = (p.vy + idleVy + springVy + pushVy) * PARTICLE_CFG.damping;

      p.x += p.vx;
      p.y += p.vy;

      // ── Orient capsule along velocity ────────────────────────
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > 0.05) {
        p.angle = Math.atan2(p.vy, p.vx);
      }

      drawGlassCapsule(ctx, p.x, p.y, p.angle, p.len, p.isBlue);
    }

    rafId = requestAnimationFrame(tickParticles);
  }

  /**
   * Draw a rotated frosted glass capsule at (cx, cy):
   * 1. Soft tinted caustic drop shadow on the cream canvas.
   * 2. Translucent refraction gradient body (crystalline tinted core).
   * 3. Polished specular rim / beveled highlight.
   * 4. Specular gleam line across the upper glass face.
   */
  function drawGlassCapsule(ctx, cx, cy, angle, len, isBlue) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const r = PARTICLE_CFG.thickness;
    const l = len;

    // ── 1. Soft depth shadow on the cream surface ───────────────
    ctx.shadowColor = isBlue ? 'rgba(32, 48, 154, 0.18)' : 'rgba(187, 35, 43, 0.18)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.2;

    // ── 2. Construct capsule path ───────────────────────────────
    ctx.beginPath();
    ctx.moveTo(-l + r, -r);
    ctx.lineTo( l - r, -r);
    ctx.arc(   l - r,  0,  r,  -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(-l + r,  r);
    ctx.arc(  -l + r,  0,  r,   Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();

    // ── 3. Translucent tinted frosted glass gradient ────────────
    const bodyGrad = ctx.createLinearGradient(0, -r, 0, r);
    if (isBlue) {
      bodyGrad.addColorStop(0,    'rgba(255, 255, 255, 0.85)'); // top specular sheen
      bodyGrad.addColorStop(0.25, 'rgba(64, 88, 205, 0.42)');   // light translucent blue
      bodyGrad.addColorStop(0.75, 'rgba(32, 48, 154, 0.68)');   // crystal blue body
      bodyGrad.addColorStop(1,    'rgba(32, 48, 154, 0.35)');   // bottom refraction
    } else {
      bodyGrad.addColorStop(0,    'rgba(255, 255, 255, 0.85)'); // top specular sheen
      bodyGrad.addColorStop(0.25, 'rgba(220, 68, 76, 0.42)');   // light translucent ruby
      bodyGrad.addColorStop(0.75, 'rgba(187, 35, 43, 0.68)');   // crystal red body
      bodyGrad.addColorStop(1,    'rgba(187, 35, 43, 0.35)');   // bottom refraction
    }

    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // ── 4. Polished glass bevel rim (crisp specular edge) ───────
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.lineWidth = 0.85;

    const rimGrad = ctx.createLinearGradient(-l, -r, l, r);
    rimGrad.addColorStop(0,    'rgba(255, 255, 255, 0.95)'); // sharp light catch
    rimGrad.addColorStop(0.4,  isBlue ? 'rgba(90, 120, 240, 0.55)' : 'rgba(235, 80, 90, 0.55)');
    rimGrad.addColorStop(0.8,  'rgba(255, 255, 255, 0.75)');
    rimGrad.addColorStop(1,    isBlue ? 'rgba(32, 48, 154, 0.4)' : 'rgba(187, 35, 43, 0.4)');

    ctx.strokeStyle = rimGrad;
    ctx.stroke();

    // ── 5. Specular highlight streak (light reflection line) ────
    if (l > r * 1.4) {
      ctx.beginPath();
      ctx.moveTo(-l * 0.55, -r * 0.42);
      ctx.lineTo( l * 0.45, -r * 0.42);
      ctx.lineWidth = 0.65;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.stroke();
    }

    ctx.restore();
  }

  // ── Pointer tracking ──────────────────────────────────────────
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

  // ── Visibility — pause animation when tab is hidden ──────────
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      rafId = requestAnimationFrame(tickParticles);
    }
  });

  // ── Resize ───────────────────────────────────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvas, 150);
  });

  // ── Kick off ─────────────────────────────────────────────────
  resizeCanvas();
  rafId = requestAnimationFrame(tickParticles);
}


/* ═══════════════════════════════════════════════════════════════
   3.  TRADING WAVE
   ═══════════════════════════════════════════════════════════════ */

function initWave() {

  const svg    = document.getElementById('wave-svg');
  const pathEl = document.getElementById('wave-path');
  const fillEl = document.getElementById('wave-fill');
  const dotEl  = document.getElementById('wave-dot');

  if (!svg || !pathEl) return;

  /** yHistory[i] = normalised Y value (0 = top, 1 = bottom) */
  let yHistory = [];

  /** Accumulated horizontal scroll offset (sub-pixel) */
  let scrollOffset = 0;

  /** Current pseudo-random Y */
  let currentY = WAVE_CFG.baseY;

  /** Frame index for new-point rate throttling */
  let waveFrame = 0;

  /** Stroke length for the draw-in animation */
  let totalLength = 0;

  /** Draw-in progress: 0 = nothing drawn, 1 = fully drawn */
  let drawInProgress = REDUCED_MOTION ? 1 : 0;

  // ── Seed initial history ──────────────────────────────────────
  function seedHistory(numPoints) {
    yHistory = [];
    currentY = WAVE_CFG.baseY;
    for (let i = 0; i < numPoints; i++) {
      currentY = nextY(currentY, i);
      yHistory.push(currentY);
    }
  }

  /**
   * Generate next Y value preserving an upward trend with jagged price noise.
   */
  function nextY(prev, idx) {
    const trendTarget = 0.28;
    const trendPull   = (trendTarget - prev) * 0.018;
    const noise       = (Math.random() - 0.42) * WAVE_CFG.noiseMag * 2;
    const spike       = Math.random() < 0.12
      ? (Math.random() - 0.5) * WAVE_CFG.noiseMag * 3.5
      : 0;

    let next = prev + trendPull + noise + spike;
    return clamp(next, 0.10, 0.85);
  }

  function pointCoord(svgW, svgH, i) {
    const numPts = yHistory.length;
    const x = (i / (numPts - 1)) * svgW - scrollOffset;
    const y = yHistory[i] * svgH;
    return { x, y };
  }

  function rebuildPath() {
    const rect = svg.getBoundingClientRect();
    const svgW = rect.width  || svg.clientWidth  || 600;
    const svgH = rect.height || svg.clientHeight || 160;

    if (yHistory.length < 2) return;

    let d = '';
    for (let i = 0; i < yHistory.length; i++) {
      const { x, y } = pointCoord(svgW, svgH, i);
      d += i === 0 ? `M ${x.toFixed(2)},${y.toFixed(2)} ` : `L ${x.toFixed(2)},${y.toFixed(2)} `;
    }

    pathEl.setAttribute('d', d);

    // Fill path: close below the line
    const last  = pointCoord(svgW, svgH, yHistory.length - 1);
    const first = pointCoord(svgW, svgH, 0);
    const fillD = d + ` L ${last.x.toFixed(2)},${svgH} L ${first.x.toFixed(2)},${svgH} Z`;
    fillEl.setAttribute('d', fillD);

    // Move the endpoint dot
    dotEl.setAttribute('cx', last.x.toFixed(2));
    dotEl.setAttribute('cy', last.y.toFixed(2));

    // Draw-in via stroke-dashoffset
    if (drawInProgress < 1) {
      if (totalLength === 0) {
        try { totalLength = pathEl.getTotalLength(); } catch(e) {}
        pathEl.style.strokeDasharray  = totalLength;
        pathEl.style.strokeDashoffset = totalLength;
        fillEl.style.opacity = '0';
      }
      const offset = totalLength * (1 - drawInProgress);
      pathEl.style.strokeDashoffset = offset;
      fillEl.style.opacity = drawInProgress.toFixed(3);
    } else {
      pathEl.style.strokeDasharray  = 'none';
      pathEl.style.strokeDashoffset = '0';
      fillEl.style.opacity = '1';
    }
  }

  let waveRafId = null;

  function tickWave() {
    waveFrame++;

    if (!REDUCED_MOTION) {
      if (drawInProgress < 1) {
        drawInProgress = Math.min(1, drawInProgress + 1 / WAVE_CFG.drawInFrames);
      }

      scrollOffset += WAVE_CFG.scrollSpeed;

      const svgW = svg.clientWidth || 600;
      const pointSpacing = svgW / (yHistory.length - 1);

      if (scrollOffset >= pointSpacing) {
        scrollOffset -= pointSpacing;
        yHistory.shift();
        const newY = nextY(yHistory[yHistory.length - 1], waveFrame);
        yHistory.push(newY);
      }
    }

    rebuildPath();
    waveRafId = requestAnimationFrame(tickWave);
  }

  function resizeWave() {
    const svgW = svg.clientWidth || 600;
    const pointSpacing = Math.max(4, svgW / (WAVE_CFG.historyLen - 1));
    const numPoints    = Math.ceil(svgW / pointSpacing) + 2;
    seedHistory(clamp(numPoints, 60, WAVE_CFG.historyLen));
    scrollOffset = 0;
    totalLength  = 0;
    if (!REDUCED_MOTION) {
      drawInProgress = 0;
    }
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(waveRafId);
      waveRafId = null;
    } else if (!waveRafId) {
      waveRafId = requestAnimationFrame(tickWave);
    }
  });

  window.addEventListener('resize', () => {
    clearTimeout(window._waveResizeTimer);
    window._waveResizeTimer = setTimeout(resizeWave, 160);
  });

  resizeWave();
  waveRafId = requestAnimationFrame(tickWave);
}


/* ═══════════════════════════════════════════════════════════════
   4.  INIT — bootstrap on DOMContentLoaded
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
