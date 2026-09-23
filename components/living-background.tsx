"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  /** Effective position after pointer displacement — everything downstream
   *  (grid, links, pulses, node draw) reads these, not x/y. */
  ex: number;
  ey: number;
  vx: number;
  vy: number;
  r: number;
  tone: 0 | 1;
  /** How strongly this node is leaning toward the cursor, 0..1, eased. */
  pull: number;
  /** Incremented on every edge teleport. Pulses use it to detect a wrap and
   *  die, rather than streaking across the whole viewport. */
  wrap: number;
  /** Radial band from the centre: 0 = dense core, 2 = sparse edge. */
  band: 0 | 1 | 2;
}

interface Pulse {
  a: number;
  b: number;
  t: number;
  speed: number;
  wa: number;
  wb: number;
}

/** Link alphas are quantised into buckets so every segment in a bucket is drawn
 *  with one stroke() instead of one per link. The last bucket is the pointer
 *  "hot" bucket, which costs no extra draw call. */
const ALPHA_BUCKETS = 5;
const HOT_BUCKET = ALPHA_BUCKETS;
const TOTAL_BUCKETS = ALPHA_BUCKETS + 1;
const BANDS = 3;

const POINTER_RADIUS = 170;
const POINTER_MAX_OFFSET = 14;

/**
 * Real-time animated background: a drifting "automation network" of nodes and
 * data-flow links around a glowing core. The field zooms and parallaxes as the
 * page scrolls, nodes lean toward the cursor, and occasional pulses of light
 * travel the links — echoing the workflow graph in the hero.
 *
 * Colours come from CSS custom properties so it tracks the active theme.
 */
export function LivingBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let baseMaxDist = 150;
    let maxDist = 150;

    // eased values that trail the scroll target for filmic motion
    let curScale = 1;
    let curCore = 0.5;
    let curParallax = 0;

    let scrollRange = 1;
    let cachedGlow: CanvasGradient | null = null;
    let cachedGlowCore = -1;
    let cachedGlowY = -1;
    let lastFrame = 0;

    // Effect-local, NOT a ref. A useRef survives StrictMode's dev
    // mount -> cleanup -> remount, so a stale cancelled frame id would leave the
    // loop permanently refusing to start. Effect-local state is clean per run.
    let rafId: number | null = null;
    let running = false;

    // Pointer state. clientX/clientY are already canvas CSS pixels because the
    // wrapper is `fixed inset-0` — this breaks if that ever changes.
    let pointerX = 0;
    let pointerY = 0;
    let pointerTarget = 0;
    let mouseAmp = 0;
    let pointerIdleTimer = 0;

    const pulses: Pulse[] = [];
    let nextPulseAt = 0;

    let coreRGB = "208, 203, 220";
    let linkRGB = "168, 162, 190";
    let pulseRGB = "242, 240, 255";
    const toneRGB: [string, string] = ["125, 115, 168", "208, 203, 220"];

    const mobile = () => window.innerWidth < 768;
    const maxPulses = () => (reduced ? 0 : mobile() ? 1 : 3);

    // Reused across frames — building Path2D from strings allocated ~200 strings
    // and forced a parse every frame.
    const linkPaths: Path2D[] = [];
    const nodeHalo: Path2D[] = [];
    const nodeCore: Path2D[] = [];

    const hexToRgb = (hex: string): string | null => {
      const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
      if (!m) return null;
      return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
    };

    const readTheme = () => {
      const s = getComputedStyle(document.documentElement);
      const link = s.getPropertyValue("--node-link").trim();
      const pulse = s.getPropertyValue("--node-pulse").trim();
      const core = hexToRgb(s.getPropertyValue("--node-core"));
      const dim = hexToRgb(s.getPropertyValue("--node-dim"));
      if (link) linkRGB = link;
      if (pulse) pulseRGB = pulse;
      if (core) {
        coreRGB = core;
        toneRGB[1] = core;
      }
      if (dim) toneRGB[0] = dim;
      cachedGlow = null;
    };

    const initParticles = () => {
      const count = mobile()
        ? 30
        : Math.min(72, Math.floor((width * height) / 26000));
      baseMaxDist = mobile() ? 120 : 152;
      maxDist = baseMaxDist;
      const cx = width / 2;
      const cy = height * 0.42;
      const maxR = Math.max(width, height) * 0.62;

      particles = Array.from({ length: count }, () => {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const d = Math.hypot(x - cx, y - cy) / maxR;
        const band = (d < 0.45 ? 0 : d < 0.8 ? 1 : 2) as 0 | 1 | 2;
        return {
          x,
          y,
          ex: x,
          ey: y,
          vx: (Math.random() - 0.5) * 0.16,
          vy: (Math.random() - 0.5) * 0.16,
          r: Math.random() * 1.5 + 0.7,
          tone: (Math.random() < 0.42 ? 0 : 1) as 0 | 1,
          pull: 0,
          wrap: 0,
          band,
        };
      });
      pulses.length = 0;
    };

    const measureScrollRange = () => {
      scrollRange = Math.max(
        1,
        document.documentElement.scrollHeight - window.innerHeight,
      );
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cachedGlow = null;
      readTheme();
      initParticles();
      measureScrollRange();
    };

    /** Move nodes toward the cursor. Runs before the grid is built so every
     *  downstream consumer sees consistent ex/ey. */
    const applyPointer = () => {
      if (coarsePointer || reduced) {
        for (const p of particles) {
          p.ex = p.x;
          p.ey = p.y;
        }
        return;
      }

      mouseAmp += (pointerTarget - mouseAmp) * 0.05;

      // Screen -> network space. Forward transform is
      // translate(cx, cy + P) . scale(S) . translate(-cx, -cy)
      const cx = width / 2;
      const cy = height * 0.42;
      const mx = cx + (pointerX - cx) / curScale;
      const my = cy + (pointerY - cy - curParallax) / curScale;

      for (const p of particles) {
        const dx = mx - p.x;
        const dy = my - p.y;
        const d2 = dx * dx + dy * dy;
        let target = 0;
        if (d2 < POINTER_RADIUS * POINTER_RADIUS) {
          const f = 1 - Math.sqrt(d2) / POINTER_RADIUS;
          target = f * f * mouseAmp;
        }
        p.pull += (target - p.pull) * 0.12;

        if (p.pull > 0.001) {
          const d = Math.sqrt(d2) || 1;
          p.ex = p.x + (dx / d) * p.pull * POINTER_MAX_OFFSET;
          p.ey = p.y + (dy / d) * p.pull * POINTER_MAX_OFFSET;
        } else {
          p.ex = p.x;
          p.ey = p.y;
        }
      }
    };

    /** Uniform spatial grid over effective positions. Numeric keys — string keys
     *  allocated ~720 strings per frame. */
    const buildLinks = (now: number) => {
      // Path2D has no clear(), so these are rebuilt per frame — still far
      // cheaper than the string-building this replaced, which allocated ~200
      // strings and forced a path parse every frame.
      linkPaths.length = 0;
      for (let i = 0; i < TOTAL_BUCKETS; i++) linkPaths.push(new Path2D());

      const cell = maxDist;
      const grid = new Map<number, number[]>();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const key =
          Math.floor(p.ex / cell) * 4096 + Math.floor(p.ey / cell) + 8388608;
        const list = grid.get(key);
        if (list) list.push(i);
        else grid.set(key, [i]);
      }

      const maxDist2 = maxDist * maxDist;
      const wantPulse = !reduced && now >= nextPulseAt && pulses.length < maxPulses();
      let candCount = 0;
      let candA = -1;
      let candB = -1;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const gx = Math.floor(p.ex / cell);
        const gy = Math.floor(p.ey / cell);
        for (let ox = -1; ox <= 1; ox++) {
          for (let oy = -1; oy <= 1; oy++) {
            const neighbours = grid.get((gx + ox) * 4096 + (gy + oy) + 8388608);
            if (!neighbours) continue;
            for (const j of neighbours) {
              if (j <= i) continue; // each pair once, no Set hashing
              const q = particles[j];
              const dx = p.ex - q.ex;
              const dy = p.ey - q.ey;
              const d2 = dx * dx + dy * dy;
              if (d2 >= maxDist2) continue;

              const t = 1 - Math.sqrt(d2) / maxDist;
              const bucket =
                p.pull + q.pull > 0.55
                  ? HOT_BUCKET
                  : Math.min(ALPHA_BUCKETS - 1, Math.floor(t * ALPHA_BUCKETS));

              const path = linkPaths[bucket];
              path.moveTo(p.ex, p.ey);
              path.lineTo(q.ex, q.ey);

              // Reservoir-sample one short/bright link to carry the next pulse.
              if (wantPulse && bucket >= 2 && bucket !== HOT_BUCKET) {
                candCount++;
                if (Math.random() < 1 / candCount) {
                  candA = i;
                  candB = j;
                }
              }
            }
          }
        }
      }

      if (wantPulse && candA >= 0) {
        pulses.push({
          a: candA,
          b: candB,
          t: 0,
          speed: 0.01 + Math.random() * 0.006,
          wa: particles[candA].wrap,
          wb: particles[candB].wrap,
        });
        nextPulseAt = now + 1600 + Math.random() * 2200;
      }
    };

    const drawPulses = (dtScale: number) => {
      for (let i = pulses.length - 1; i >= 0; i--) {
        const pu = pulses[i];
        const a = particles[pu.a];
        const b = particles[pu.b];

        // A wrapped endpoint would make the pulse streak across the viewport.
        if (!a || !b || a.wrap !== pu.wa || b.wrap !== pu.wb) {
          pulses.splice(i, 1);
          continue;
        }

        const dx = b.ex - a.ex;
        const dy = b.ey - a.ey;
        const d = Math.hypot(dx, dy);
        if (d >= maxDist) {
          pulses.splice(i, 1);
          continue;
        }

        pu.t += pu.speed * dtScale;
        if (pu.t > 1) {
          pulses.splice(i, 1);
          continue;
        }

        // Dim as the link stretches toward breaking, rather than popping out.
        const fade = Math.max(
          0,
          Math.min(1, (maxDist - d) / (maxDist * 0.3)),
        );
        const e = pu.t * pu.t * (3 - 2 * pu.t); // smoothstep
        const x = a.ex + dx * e;
        const y = a.ey + dy * e;

        const tailT = Math.max(0, e - 0.16);
        ctx.strokeStyle = `rgba(${pulseRGB}, ${0.3 * fade})`;
        ctx.lineWidth = 1.4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(a.ex + dx * tailT, a.ey + dy * tailT);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.fillStyle = `rgba(${pulseRGB}, ${0.14 * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${pulseRGB}, ${0.95 * fade})`;
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const render = (dtScale: number, now: number) => {
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height * 0.42;
      const coreY = cy + curParallax * 0.5;
      const coreR = Math.max(width, height) * 0.3 * curCore;

      if (
        !cachedGlow ||
        Math.abs(curCore - cachedGlowCore) > cachedGlowCore * 0.01 ||
        Math.abs(coreY - cachedGlowY) > 2
      ) {
        const glow = ctx.createRadialGradient(cx, coreY, 0, cx, coreY, coreR);
        glow.addColorStop(0, `rgba(${coreRGB}, 0.13)`);
        glow.addColorStop(0.4, `rgba(${coreRGB}, 0.05)`);
        glow.addColorStop(1, `rgba(${coreRGB}, 0)`);
        cachedGlow = glow;
        cachedGlowCore = curCore;
        cachedGlowY = coreY;
      }
      ctx.fillStyle = cachedGlow;
      ctx.fillRect(0, 0, width, height);

      for (let k = 1; k <= 2; k++) {
        ctx.strokeStyle = `rgba(${toneRGB[0]}, ${0.1 / k})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, coreY, coreR * 0.5 * k, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.save();
      ctx.translate(cx, cy + curParallax);
      ctx.scale(curScale, curScale);
      ctx.translate(-cx, -cy);

      if (!reduced) {
        for (const p of particles) {
          p.x += p.vx * dtScale;
          p.y += p.vy * dtScale;
          if (p.x < -24) {
            p.x = width + 24;
            p.wrap++;
          } else if (p.x > width + 24) {
            p.x = -24;
            p.wrap++;
          }
          if (p.y < -24) {
            p.y = height + 24;
            p.wrap++;
          } else if (p.y > height + 24) {
            p.y = -24;
            p.wrap++;
          }
        }
      }

      applyPointer();
      buildLinks(now);

      ctx.lineWidth = 0.6;
      for (let b = 0; b < TOTAL_BUCKETS; b++) {
        const alpha =
          b === HOT_BUCKET ? 0.75 : ((b + 0.5) / ALPHA_BUCKETS) * 0.46;
        ctx.strokeStyle = `rgba(${linkRGB}, ${alpha})`;
        ctx.stroke(linkPaths[b]);
      }

      // Nodes batched per (tone, band) so density falloff costs no extra calls.
      nodeHalo.length = 0;
      nodeCore.length = 0;
      for (let i = 0; i < 2 * BANDS; i++) {
        nodeHalo.push(new Path2D());
        nodeCore.push(new Path2D());
      }
      for (const p of particles) {
        const slot = p.tone * BANDS + p.band;
        const halo = nodeHalo[slot];
        halo.moveTo(p.ex + p.r * 3.2, p.ey);
        halo.arc(p.ex, p.ey, p.r * 3.2, 0, Math.PI * 2);
        const core = nodeCore[slot];
        core.moveTo(p.ex + p.r, p.ey);
        core.arc(p.ex, p.ey, p.r, 0, Math.PI * 2);
      }
      const bandFade = [1, 0.72, 0.45];
      for (let tone = 0; tone < 2; tone++) {
        for (let band = 0; band < BANDS; band++) {
          const slot = tone * BANDS + band;
          const f = bandFade[band];
          ctx.fillStyle = `rgba(${toneRGB[tone]}, ${0.16 * f})`;
          ctx.fill(nodeHalo[slot]);
          ctx.fillStyle = `rgba(${toneRGB[tone]}, ${0.85 * f})`;
          ctx.fill(nodeCore[slot]);
        }
      }

      drawPulses(dtScale);

      ctx.restore();
    };

    const targets = () => {
      const p = progressRef.current;
      const p2 = p * p; // quadratic: accelerates, so the zoom actually reads
      return {
        scale: 1 + 2.6 * p2,
        core: 0.5 + 2.4 * p2,
        parallax: p * -180,
      };
    };

    const tick = (now: number) => {
      const minDelta = mobile() ? 33 : 0;
      if (now - lastFrame < minDelta) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = lastFrame === 0 ? 16.67 : Math.min(100, now - lastFrame);
      lastFrame = now;
      const dtScale = dt / 16.67;

      // dt-corrected easing, so a flick or the 30fps mobile cap doesn't change
      // how fast the field catches up.
      const k = 1 - Math.pow(1 - 0.085, dtScale);
      const t = targets();
      curScale += (t.scale - curScale) * k;
      curCore += (t.core - curCore) * k;
      curParallax += (t.parallax - curParallax) * k;

      // Widen link reach as we fly in, or the network visibly disconnects.
      maxDist = baseMaxDist * Math.min(2, 1 + 0.35 * (curScale - 1));

      render(dtScale, now);

      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (running || reduced || document.hidden) return;
      running = true;
      lastFrame = 0;
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const syncProgress = () => {
      progressRef.current = Math.min(
        1,
        Math.max(0, window.scrollY / scrollRange),
      );
      if (reduced) {
        const t = targets();
        curScale = t.scale;
        curCore = t.core;
        curParallax = t.parallax;
        maxDist = baseMaxDist * Math.min(2, 1 + 0.35 * (curScale - 1));
        render(1, performance.now());
      } else {
        startLoop();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointerX = e.clientX;
      pointerY = e.clientY;
      pointerTarget = 1;
      window.clearTimeout(pointerIdleTimer);
      pointerIdleTimer = window.setTimeout(() => {
        pointerTarget = 0;
      }, 2500);
    };

    const onPointerOut = (e: PointerEvent) => {
      if (e.relatedTarget === null) pointerTarget = 0;
    };

    const onBlur = () => {
      pointerTarget = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };

    const onMotionPreference = () => {
      reduced = motionQuery.matches;
      if (reduced) {
        stopLoop();
        render(1, performance.now());
      } else {
        startLoop();
      }
    };

    let resizeTimer: number;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        resize();
        syncProgress();
        if (reduced) render(1, performance.now());
      }, 150);
    };

    // Page height changes (e.g. the tall scroll-scrubbed section mounting) must
    // update the cached range, or scroll progress uses a stale value.
    const bodyObserver = new ResizeObserver(() => {
      measureScrollRange();
      syncProgress();
    });
    bodyObserver.observe(document.body);

    resize();
    syncProgress();

    if (reduced) render(1, performance.now());
    else startLoop();

    window.addEventListener("scroll", syncProgress, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    motionQuery.addEventListener("change", onMotionPreference);
    if (!coarsePointer) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      window.addEventListener("pointerout", onPointerOut);
      window.addEventListener("blur", onBlur);
    }

    return () => {
      stopLoop();
      window.clearTimeout(resizeTimer);
      window.clearTimeout(pointerIdleTimer);
      bodyObserver.disconnect();
      window.removeEventListener("scroll", syncProgress);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotionPreference);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden="true">
      <canvas ref={canvasRef} className="h-full w-full" />
      {/* contrast scrims: vignette + top/bottom fades keep foreground text legible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_86%_64%_at_50%_34%,transparent_58%,var(--background)_100%)] opacity-55" />
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
