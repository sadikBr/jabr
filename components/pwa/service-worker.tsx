"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Registers the service worker (production only, so development never serves
 * stale files) and tells it which pages and assets to keep for offline use.
 */
export function ServiceWorker() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // No service worker (private mode, unsupported): the app works online.
      });
  }, []);

  // Each page opened is saved, along with the files it loaded and the pages
  // it links to. Moving between pages inside the app does not request their
  // HTML, so the worker fetches it. Sent a moment after the page settles, so
  // prefetches for visible links have been made.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      navigator.serviceWorker.ready
        .then((registration) => {
          if (cancelled) return;
          const loaded = performance
            .getEntriesByType("resource")
            .map((entry) => new URL(entry.name));
          // Links the router has prefetched show up as "?_rsc=" requests. Those
          // are the pages one tap away, so their HTML is saved as well.
          const linked = loaded
            .filter(
              (url) =>
                url.origin === window.location.origin &&
                url.searchParams.has("_rsc"),
            )
            .map((url) => url.pathname);
          registration.active?.postMessage({
            type: "warm",
            pages: [...new Set([pathname, ...linked])],
            assets: loaded
              .filter((url) => !url.searchParams.has("_rsc"))
              .map((url) => url.href),
          });
        })
        .catch(() => {});
    }, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
