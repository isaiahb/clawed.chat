import { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  maxOpacity: number;
  life: number;
  maxLife: number;
  hue: number;
}

interface ParticleFieldProps {
  /** Number of particles. Default 40 */
  count?: number;
  /** Base color hue (0–360). Default 10 (red/ember) */
  hue?: number;
  /** Hue variation range. Default 30 */
  hueSpread?: number;
  /** Whether particles react to mouse. Default true */
  interactive?: boolean;
  /** Overall opacity multiplier. Default 1 */
  opacity?: number;
  /** className for the canvas container */
  className?: string;
  /** Speed multiplier. Default 1 */
  speed?: number;
}

export function ParticleField({
  count = 40,
  hue = 10,
  hueSpread = 30,
  interactive = true,
  opacity = 1,
  className = "",
  speed = 1,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false });
  const rafRef = useRef<number>(0);
  const dprRef = useRef(1);

  const createParticle = useCallback(
    (width: number, height: number, randomAge = false): Particle => {
      const maxLife = 200 + Math.random() * 400;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3 * speed,
        vy: -(0.15 + Math.random() * 0.4) * speed,
        size: 0.5 + Math.random() * 1.8,
        opacity: 0,
        maxOpacity: 0.15 + Math.random() * 0.45,
        life: randomAge ? Math.random() * maxLife : 0,
        maxLife,
        hue: hue + (Math.random() - 0.5) * hueSpread,
      };
    },
    [hue, hueSpread, speed],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    // Handle DPR for sharp rendering
    const updateSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);

    // Init particles
    const rect = canvas.getBoundingClientRect();
    particlesRef.current = Array.from({ length: count }, () =>
      createParticle(rect.width, rect.height, true),
    );

    // Mouse tracking
    const onMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const r = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        active: true,
      };
    };
    const onMouseLeave = () => {
      mouseRef.current.active = false;
    };

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Animation loop
    const animate = () => {
      const w = canvas.width / dprRef.current;
      const h = canvas.height / dprRef.current;
      ctx.clearRect(0, 0, w, h);

      const mouse = mouseRef.current;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];

        // Age
        p.life += 1;

        // Fade in / out
        const lifeRatio = p.life / p.maxLife;
        if (lifeRatio < 0.15) {
          p.opacity = (lifeRatio / 0.15) * p.maxOpacity;
        } else if (lifeRatio > 0.75) {
          p.opacity = ((1 - lifeRatio) / 0.25) * p.maxOpacity;
        } else {
          p.opacity = p.maxOpacity;
        }

        // Mouse repulsion
        if (mouse.active && interactive) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;
          if (dist < maxDist && dist > 0) {
            const force = ((maxDist - dist) / maxDist) * 0.6;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        }

        // Damping
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Slight upward drift + gentle wave
        p.vy -= 0.002 * speed;
        p.vx += Math.sin(p.life * 0.02) * 0.005 * speed;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Draw
        const a = p.opacity * opacity;
        if (a > 0.005) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 85%, 55%, ${a})`;
          ctx.fill();

          // Soft glow
          if (p.size > 1) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${p.hue}, 90%, 50%, ${a * 0.12})`;
            ctx.fill();
          }
        }

        // Respawn if dead or out of bounds
        if (
          p.life >= p.maxLife ||
          p.x < -20 ||
          p.x > w + 20 ||
          p.y < -20 ||
          p.y > h + 20
        ) {
          particlesRef.current[i] = createParticle(w, h, false);
          // Spawn from bottom-ish area
          particlesRef.current[i].y = h + Math.random() * 10;
          particlesRef.current[i].x = Math.random() * w;
        }
      }

      // Draw subtle connections between close particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        const a = particlesRef.current[i];
        if (a.opacity < 0.1) continue;
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const b = particlesRef.current[j];
          if (b.opacity < 0.1) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxConn = 80;
          if (dist < maxConn) {
            const lineOpacity =
              ((maxConn - dist) / maxConn) *
              Math.min(a.opacity, b.opacity) *
              0.15 *
              opacity;
            if (lineOpacity > 0.003) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `hsla(${hue}, 70%, 50%, ${lineOpacity})`;
              ctx.lineWidth = 0.4;
              ctx.stroke();
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      resizeObserver.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [count, hue, hueSpread, interactive, opacity, speed, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-auto absolute inset-0 h-full w-full ${className}`}
      style={{ mixBlendMode: "screen" }}
      aria-hidden="true"
    />
  );
}
