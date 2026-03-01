import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop resets the scroll position to the top of the page
 * whenever the route pathname changes. Place this component inside
 * your <BrowserRouter> to enable the behavior globally.
 *
 * It also handles smooth scrolling to hash anchors if present.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If there's a hash, try to scroll to that element
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        // Small delay to ensure the DOM has rendered
        requestAnimationFrame(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }
    }

    // Otherwise scroll to top instantly
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
