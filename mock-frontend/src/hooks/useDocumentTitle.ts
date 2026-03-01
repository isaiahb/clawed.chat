import { useEffect, useRef } from "react";

/**
 * Sets the document title and restores the previous title on unmount.
 *
 * @param title - The title to set. Pass `null` or `undefined` to skip.
 * @param options.suffix - Appended after the title (default: "Clawed")
 * @param options.restoreOnUnmount - Whether to restore the previous title when the component unmounts (default: true)
 *
 * @example
 * ```ts
 * // Sets document.title to "Inbox — Clawed"
 * useDocumentTitle("Inbox");
 *
 * // Sets document.title to "Settings — My App"
 * useDocumentTitle("Settings", { suffix: "My App" });
 *
 * // Sets document.title to just "Dashboard" with no suffix
 * useDocumentTitle("Dashboard", { suffix: "" });
 * ```
 */
export function useDocumentTitle(
  title: string | null | undefined,
  options: {
    suffix?: string;
    restoreOnUnmount?: boolean;
  } = {},
) {
  const { suffix = "Clawed", restoreOnUnmount = true } = options;
  const previousTitle = useRef(document.title);

  useEffect(() => {
    if (title == null) return;

    const fullTitle = suffix ? `${title} — ${suffix}` : title;
    document.title = fullTitle;
  }, [title, suffix]);

  useEffect(() => {
    const saved = previousTitle.current;

    return () => {
      if (restoreOnUnmount) {
        document.title = saved;
      }
    };
    // Only run cleanup on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default useDocumentTitle;
