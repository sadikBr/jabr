"use client";

import { useEffect } from "react";

/**
 * Sets `data-hydrated` on <html> once the page's scripts have attached.
 * Effects run children first, so by the time this one runs the rest of the
 * page is interactive. End-to-end tests wait for it before clicking; it is
 * also a handy hook for styling anything that should only show when usable.
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "true";
  }, []);
  return null;
}
