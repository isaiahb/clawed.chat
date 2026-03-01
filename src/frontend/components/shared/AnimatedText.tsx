import { useEffect, useState, useCallback, useRef } from "react";

// ──────────────────────────────────────────────
// 1 · Typewriter — types out text character by character
// ──────────────────────────────────────────────

interface TypewriterProps {
  /** The full text to type out */
  text: string;
  /** Delay before typing starts (ms). Default 0 */
  delay?: number;
  /** Speed per character (ms). Default 45 */
  speed?: number;
  /** Whether to show a blinking cursor. Default true */
  cursor?: boolean;
  /** Cursor character. Default "▊" */
  cursorChar?: string;
  /** className applied to the wrapper span */
  className?: string;
  /** Called when typing completes */
  onComplete?: () => void;
  /** Whether the animation should play. Default true */
  enabled?: boolean;
}

export function Typewriter({
  text,
  delay = 0,
  speed = 45,
  cursor = true,
  cursorChar = "▊",
  className = "",
  onComplete,
  enabled = true,
}: TypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setDisplayedText(text);
      setDone(true);
      return;
    }

    setDisplayedText("");
    setDone(false);
    indexRef.current = 0;

    const delayTimer = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => clearTimeout(delayTimer);
  }, [text, delay, enabled]);

  useEffect(() => {
    if (!started || !enabled) return;

    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current <= text.length) {
        setDisplayedText(text.slice(0, indexRef.current));
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [started, text, speed, onComplete, enabled]);

  return (
    <span className={className}>
      {displayedText}
      {cursor && !done && (
        <span
          className="inline-block animate-pulse text-claw-red"
          style={{ animationDuration: "0.8s" }}
          aria-hidden="true"
        >
          {cursorChar}
        </span>
      )}
    </span>
  );
}

// ──────────────────────────────────────────────
// 2 · WordRotator — cycles through words with a transition
// ──────────────────────────────────────────────

interface WordRotatorProps {
  /** Array of words/phrases to cycle through */
  words: string[];
  /** Time each word stays visible (ms). Default 2500 */
  interval?: number;
  /** Transition style. Default "slide" */
  transition?: "slide" | "fade" | "blur" | "flip";
  /** className applied to the outer wrapper span */
  className?: string;
  /** className applied directly to the inner word span (use for gradient text) */
  wordClassName?: string;
  /** Transition duration in ms. Default 500 */
  duration?: number;
}

export function WordRotator({
  words,
  interval = 2500,
  transition = "slide",
  className = "",
  wordClassName = "",
  duration = 500,
}: WordRotatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<"in" | "out">("in");

  useEffect(() => {
    if (words.length <= 1) return;

    const timer = setInterval(() => {
      // Start exit animation
      setDirection("out");
      setIsAnimating(true);

      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % words.length);
        setDirection("in");

        setTimeout(() => {
          setIsAnimating(false);
        }, duration / 2);
      }, duration / 2);
    }, interval);

    return () => clearInterval(timer);
  }, [words, interval, duration]);

  const getStyle = (): React.CSSProperties => {
    const isOut = direction === "out" && isAnimating;
    const isIn = direction === "in" && isAnimating;

    const base: React.CSSProperties = {
      display: "inline-block",
      transition: `all ${duration / 2}ms cubic-bezier(0.16, 1, 0.3, 1)`,
    };

    switch (transition) {
      case "slide":
        return {
          ...base,
          transform: isOut
            ? "translateY(-110%)"
            : isIn
              ? "translateY(0)"
              : "translateY(0)",
          opacity: isOut ? 0 : 1,
        };
      case "fade":
        return {
          ...base,
          opacity: isOut ? 0 : 1,
        };
      case "blur":
        return {
          ...base,
          opacity: isOut ? 0 : 1,
          filter: isOut ? "blur(8px)" : "blur(0px)",
          transform: isOut ? "scale(0.95)" : "scale(1)",
        };
      case "flip":
        return {
          ...base,
          transform: isOut ? "rotateX(90deg)" : "rotateX(0deg)",
          opacity: isOut ? 0 : 1,
          transformOrigin: "center bottom",
        };
      default:
        return base;
    }
  };

  return (
    <span
      className={`inline-block overflow-hidden align-bottom ${className}`}
      style={{ perspective: "600px" }}
    >
      <span className={wordClassName} style={getStyle()}>
        {words[currentIndex]}
      </span>
    </span>
  );
}

// ──────────────────────────────────────────────
// 3 · LetterReveal — reveals text letter by letter with stagger
// ──────────────────────────────────────────────

interface LetterRevealProps {
  /** Text to reveal */
  text: string;
  /** Delay before starting (ms). Default 0 */
  delay?: number;
  /** Stagger between each letter (ms). Default 30 */
  stagger?: number;
  /** Whether the animation should play. Default true */
  enabled?: boolean;
  /** className for the wrapper */
  className?: string;
  /** className for each letter span */
  letterClassName?: string;
}

export function LetterReveal({
  text,
  delay = 0,
  stagger = 30,
  enabled = true,
  className = "",
  letterClassName = "",
}: LetterRevealProps) {
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : text.length);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startReveal = useCallback(() => {
    let i = 0;
    const step = () => {
      i++;
      setVisibleCount(i);
      if (i < text.length) {
        timerRef.current = setTimeout(step, stagger);
      }
    };
    timerRef.current = setTimeout(step, delay);
  }, [text, delay, stagger]);

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(text.length);
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(text.length);
      return;
    }

    setVisibleCount(0);
    startReveal();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, startReveal, text.length]);

  return (
    <span className={className} aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={`${char}-${i}`}
          className={letterClassName}
          style={{
            display: "inline-block",
            opacity: i < visibleCount ? 1 : 0,
            transform: i < visibleCount ? "translateY(0)" : "translateY(0.3em)",
            transition: `opacity 0.3s ease, transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)`,
            // Preserve whitespace
            whiteSpace: char === " " ? "pre" : undefined,
          }}
          aria-hidden="true"
        >
          {char}
        </span>
      ))}
    </span>
  );
}

// ──────────────────────────────────────────────
// 4 · CountUpText — animated counting number display
// ──────────────────────────────────────────────

interface CountUpTextProps {
  /** Target number to count up to */
  target: number;
  /** Duration of the animation (ms). Default 1800 */
  duration?: number;
  /** Suffix to append (e.g. "+", "k"). Default "" */
  suffix?: string;
  /** Prefix to prepend (e.g. "$"). Default "" */
  prefix?: string;
  /** Number of decimal places. Default 0 */
  decimals?: number;
  /** Whether to use locale formatting (commas). Default true */
  localeFormat?: boolean;
  /** className for the span */
  className?: string;
  /** Whether animation has started. Default true */
  started?: boolean;
}

export function CountUpText({
  target,
  duration = 1800,
  suffix = "",
  prefix = "",
  decimals = 0,
  localeFormat = true,
  className = "",
  started = true,
}: CountUpTextProps) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!started) {
      setCurrent(0);
      return;
    }

    let start: number | null = null;

    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(eased * target);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [started, target, duration]);

  const formatted = (() => {
    const num = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
    const str = localeFormat
      ? Number(num).toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })
      : String(num);
    return prefix + str + suffix;
  })();

  return <span className={`tabular-nums ${className}`}>{formatted}</span>;
}
