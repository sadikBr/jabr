"use client";

import { useSyncExternalStore } from "react";

import { EMPTY_PROGRESS, type Progress } from "./schema";
import { getProgress, subscribeToProgress } from "./store";

const getServerSnapshot = () => EMPTY_PROGRESS;

/**
 * The learner's progress on this device. On the server and during hydration
 * it is empty, then it updates, so prerendered pages never mismatch.
 */
export function useProgress(): Progress {
  return useSyncExternalStore(
    subscribeToProgress,
    getProgress,
    getServerSnapshot,
  );
}
