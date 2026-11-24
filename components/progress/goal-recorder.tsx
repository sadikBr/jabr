"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { recordGoal } from "@/lib/progress/store";

/**
 * Listens for the `jabr:goal` event that simulations send when their goal is
 * reached (see useGoal in components/interactives/parts.tsx) and saves it.
 */
export function GoalRecorder() {
  const pathname = usePathname();
  useEffect(() => {
    function onGoal(event: Event) {
      const id = (event as CustomEvent<{ id?: unknown }>).detail?.id;
      if (typeof id === "string") recordGoal(pathname, id);
    }
    document.addEventListener("jabr:goal", onGoal);
    return () => document.removeEventListener("jabr:goal", onGoal);
  }, [pathname]);
  return null;
}
