import { useState, useEffect, useCallback } from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 *
 * The hook listens for changes and re-renders the component whenever
 * the match state changes (e.g. when the user resizes the browser window).
 *
 * @param query - A valid CSS media query string.
 * @returns `true` if the media query currently matches, `false` otherwise.
 *
 * @example
 * ```ts
 * const isMobile = useMediaQuery("(max-width: 767px)");
 * const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
 * const isDesktop = useMediaQuery("(min-width: 1024px)");
 * const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
 * const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = useCallback((): boolean => {
    // SSR guard — default to false on the server
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQueryList = window.matchMedia(query);

    // Sync state immediately in case it changed between render and effect
    const currentMatch = mediaQueryList.matches;
    if (currentMatch !== matches) {
      setMatches(currentMatch);
    }

    // Listen for changes
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener("change", handler);

    return () => {
      mediaQueryList.removeEventListener("change", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}

// ──────────────────────────────────────────────
// Pre-built breakpoint hooks (Tailwind defaults)
// ──────────────────────────────────────────────

/** Matches Tailwind `sm` breakpoint and above (≥ 640px) */
export function useIsSm(): boolean {
  return useMediaQuery("(min-width: 640px)");
}

/** Matches Tailwind `md` breakpoint and above (≥ 768px) */
export function useIsMd(): boolean {
  return useMediaQuery("(min-width: 768px)");
}

/** Matches Tailwind `lg` breakpoint and above (≥ 1024px) */
export function useIsLg(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}

/** Matches Tailwind `xl` breakpoint and above (≥ 1280px) */
export function useIsXl(): boolean {
  return useMediaQuery("(min-width: 1280px)");
}

/** Matches Tailwind `2xl` breakpoint and above (≥ 1536px) */
export function useIs2xl(): boolean {
  return useMediaQuery("(min-width: 1536px)");
}

/** Returns `true` when the viewport is below the `md` breakpoint (< 768px) */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}

/** Returns `true` when the user prefers dark color scheme */
export function usePrefersDark(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}

/** Returns `true` when the user prefers reduced motion */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

export default useMediaQuery;
