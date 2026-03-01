import { useEffect, useRef, useState, type RefObject } from "react";

interface ScrollRevealOptions {
  /** Fraction of element visible before triggering (0–1). Default 0.15 */
  threshold?: number;
  /** Root margin string, e.g. "0px 0px -50px 0px". Default "-40px" */
  rootMargin?: string;
  /** Once revealed, never hide again. Default true */
  once?: boolean;
  /** Delay in ms before marking as revealed (for stagger). Default 0 */
  delay?: number;
}

/**
 * Observe an element and return whether it has scrolled into view.
 *
 * Usage:
 *   const { ref, isRevealed } = useScrollReveal();
 *   <div ref={ref} className={isRevealed ? "animate-in" : "opacity-0"}>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
): { ref: RefObject<T | null>; isRevealed: boolean } {
  const { threshold = 0.15, rootMargin = "-40px", once = true, delay = 0 } = options;
  const ref = useRef<T | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If the user prefers reduced motion, reveal immediately
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsRevealed(true);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (delay > 0) {
            timer = setTimeout(() => setIsRevealed(true), delay);
          } else {
            setIsRevealed(true);
          }
          if (once) observer.unobserve(el);
        } else if (!once) {
          if (timer) clearTimeout(timer);
          setIsRevealed(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [threshold, rootMargin, once, delay]);

  return { ref, isRevealed };
}

/**
 * Observe multiple children inside a container and stagger their reveal.
 *
 * Usage:
 *   const { containerRef, revealedSet } = useStaggerReveal(6, { staggerMs: 80 });
 *   <div ref={containerRef}>
 *     {items.map((item, i) => (
 *       <div className={revealedSet.has(i) ? "animate-in" : "opacity-0"}>
 */
export function useStaggerReveal(
  count: number,
  options: ScrollRevealOptions & { staggerMs?: number } = {},
): { containerRef: RefObject<HTMLDivElement | null>; revealedSet: Set<number> } {
  const { threshold = 0.1, rootMargin = "-30px", once = true, staggerMs = 70 } = options;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [revealedSet, setRevealedSet] = useState<Set<number>>(new Set());

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealedSet(new Set(Array.from({ length: count }, (_, i) => i)));
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          for (let i = 0; i < count; i++) {
            const t = setTimeout(() => {
              setRevealedSet((prev) => {
                const next = new Set(prev);
                next.add(i);
                return next;
              });
            }, i * staggerMs);
            timers.push(t);
          }
          if (once) observer.unobserve(el);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [count, threshold, rootMargin, once, staggerMs]);

  return { containerRef, revealedSet };
}

/**
 * Track the mouse position relative to an element for interactive tilt / glow.
 *
 * Returns normalised x,y in [-1, 1] range (center = 0,0).
 */
export function useMousePosition<T extends HTMLElement = HTMLDivElement>(): {
  ref: RefObject<T | null>;
  x: number;
  y: number;
  isHovering: boolean;
} {
  const ref = useRef<T | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      setPos({ x, y });
    };

    const onEnter = () => setIsHovering(true);
    const onLeave = () => {
      setIsHovering(false);
      setPos({ x: 0, y: 0 });
    };

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return { ref, x: pos.x, y: pos.y, isHovering };
}

/**
 * Animate a number from 0 → target when it scrolls into view.
 *
 * Usage:
 *   const { ref, value } = useCountUp(240_000, { duration: 2000, suffix: "+" });
 */
export function useCountUp(
  target: number,
  options: {
    duration?: number;
    delay?: number;
    suffix?: string;
    prefix?: string;
    decimals?: number;
  } = {},
): { ref: RefObject<HTMLSpanElement | null>; value: string; isRevealed: boolean } {
  const { duration = 1800, delay = 0, suffix = "", prefix = "", decimals = 0 } = options;
  const { ref, isRevealed } = useScrollReveal<HTMLSpanElement>({ threshold: 0.3, delay });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!isRevealed) return;

    let start: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);

      if (progress < 1) {
        raf = requestAnimationFrame(step);
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [isRevealed, target, duration]);

  const formatted =
    prefix +
    (decimals > 0 ? current.toFixed(decimals) : Math.round(current).toLocaleString()) +
    suffix;

  return { ref, value: formatted, isRevealed };
}

/**
 * Track vertical scroll progress for the entire page (0 → 1).
 */
export function useScrollProgress(): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let raf: number;
    let ticking = false;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min(scrollTop / docHeight, 1) : 0);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        raf = requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return progress;
}

/**
 * Returns a parallax offset value based on scroll position relative to an element.
 * The offset is in pixels and can be used for translateY transforms.
 */
export function useParallax<T extends HTMLElement = HTMLDivElement>(
  speed: number = 0.15,
): { ref: RefObject<T | null>; offset: number } {
  const ref = useRef<T | null>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let raf: number;
    let ticking = false;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const delta = (elementCenter - viewportCenter) * speed;
      setOffset(delta);
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        raf = requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    update();

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [speed]);

  return { ref, offset };
}
