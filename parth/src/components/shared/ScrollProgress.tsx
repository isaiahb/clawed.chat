import { useEffect, useState } from "react";

/**
 * A thin progress bar fixed to the top of the viewport that fills
 * left-to-right as the user scrolls down the page.
 *
 * Styled with the claw-red brand color and a subtle glow.
 * Automatically hides when at the very top (0 %).
 */
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let ticking = false;
    let raf: number;

    const update = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
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
    update(); // initial

    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      aria-hidden="true"
    >
      {/* Track (invisible) */}
      <div className="absolute inset-0 bg-transparent" />

      {/* Fill bar */}
      <div
        className="h-full origin-left will-change-transform"
        style={{
          transform: `scaleX(${progress})`,
          opacity: progress > 0.005 ? 1 : 0,
          background:
            "linear-gradient(90deg, var(--claw-red-dark), var(--claw-red), var(--claw-red-bright))",
          boxShadow:
            progress > 0.01
              ? "0 0 8px var(--claw-red-glow), 0 0 20px var(--claw-red-glow)"
              : "none",
          transition: "opacity 0.3s ease",
        }}
      />

      {/* Leading-edge dot / pulse */}
      {progress > 0.01 && progress < 0.995 && (
        <div
          className="absolute top-0 h-[2px] w-[6px]"
          style={{
            left: `${progress * 100}%`,
            transform: "translateX(-3px)",
            background: "var(--claw-red-bright)",
            boxShadow:
              "0 0 6px 2px var(--claw-red-glow), 0 0 12px 4px var(--claw-red-glow)",
          }}
        />
      )}
    </div>
  );
}
