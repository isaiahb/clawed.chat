import { useEffect, useRef, useState } from "react";

interface GlowCursorProps {
  /** Size of the glow in px. Default 400 */
  size?: number;
  /** Opacity of the glow (0–1). Default 0.07 */
  opacity?: number;
  /** Color — CSS color string. Default uses claw-red */
  color?: string;
  /** Only show on elements matching this selector. If null, show everywhere in container. */
  selector?: string | null;
  /** className for the container */
  className?: string;
  /** Whether the glow is enabled. Default true */
  enabled?: boolean;
}

/**
 * A subtle radial glow that follows the cursor.
 * Wrap a section with this component to get an ambient interactive feel.
 *
 * Usage:
 *   <div className="relative">
 *     <GlowCursor />
 *     {children}
 *   </div>
 */
export function GlowCursor({
  size = 400,
  opacity = 0.07,
  color,
  selector = null,
  className = "",
  enabled = true,
}: GlowCursorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);
  const posRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    const glow = glowRef.current;
    if (!container || !glow) return;

    // Check for reduced motion preference
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    // Also skip on touch-primary devices (no cursor)
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let isAnimating = false;

    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

    const animate = () => {
      posRef.current.x = lerp(posRef.current.x, targetRef.current.x, 0.15);
      posRef.current.y = lerp(posRef.current.y, targetRef.current.y, 0.15);

      glow.style.transform = `translate3d(${posRef.current.x - size / 2}px, ${posRef.current.y - size / 2}px, 0)`;

      // Keep animating if still moving significantly
      const dx = Math.abs(posRef.current.x - targetRef.current.x);
      const dy = Math.abs(posRef.current.y - targetRef.current.y);

      if (dx > 0.5 || dy > 0.5) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        isAnimating = false;
      }
    };

    const startAnimation = () => {
      if (!isAnimating) {
        isAnimating = true;
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetRef.current.x = e.clientX - rect.left;
      targetRef.current.y = e.clientY - rect.top;

      if (selector) {
        const target = e.target as HTMLElement;
        const matchesSelector = target.closest(selector);
        if (matchesSelector) {
          if (!visible) setVisible(true);
        } else {
          if (visible) setVisible(false);
        }
      } else {
        if (!visible) setVisible(true);
      }

      startAnimation();
    };

    const onMouseEnter = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      // Jump to position immediately on enter (no lag)
      posRef.current.x = x;
      posRef.current.y = y;
      targetRef.current.x = x;
      targetRef.current.y = y;

      if (!selector) setVisible(true);
    };

    const onMouseLeave = () => {
      setVisible(false);
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseenter", onMouseEnter);
    container.addEventListener("mouseleave", onMouseLeave);

    return () => {
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseenter", onMouseEnter);
      container.removeEventListener("mouseleave", onMouseLeave);
      cancelAnimationFrame(rafRef.current);
    };
    // Note: 'visible' is intentionally tracked via ref-like behavior inside the effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, size, selector]);

  if (!enabled) return null;

  const glowColor = color || "var(--claw-red)";

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex: 1 }}
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: visible ? opacity : 0,
          transition: "opacity 0.4s ease",
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />
    </div>
  );
}

/**
 * A card-level glow that appears on hover, centered on the card.
 * Add this inside a card with `position: relative; overflow: hidden`.
 *
 * Usage:
 *   <div className="relative overflow-hidden border ...">
 *     <CardGlow />
 *     {content}
 *   </div>
 */
export function CardGlow({
  size = 300,
  opacity = 0.06,
  color,
}: {
  size?: number;
  opacity?: number;
  color?: string;
}) {
  const glowRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Find the parent element (the card)
    const parent = containerRef.current?.parentElement;
    if (!parent) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const onMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (glowRef.current) {
        glowRef.current.style.transform = `translate3d(${x - size / 2}px, ${y - size / 2}px, 0)`;
      }
    };

    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseenter", onEnter);
    parent.addEventListener("mouseleave", onLeave);

    return () => {
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseenter", onEnter);
      parent.removeEventListener("mouseleave", onLeave);
    };
  }, [size]);

  const glowColor = color || "var(--claw-red)";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    >
      <div
        ref={glowRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
          opacity: visible ? opacity : 0,
          transition: "opacity 0.35s ease",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
