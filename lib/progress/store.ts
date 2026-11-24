import {
  applyAttempt,
  applyGoal,
  applyReview,
  applyLessonCompleted,
  applyLessonStep,
  applyReveal,
  type AttemptInput,
  type MasteryChange,
} from "./reduce";
import type { ReviewRating } from "@/lib/review/schedule";

import { EMPTY_PROGRESS, parseProgress, type Progress } from "./schema";

/**
 * The learner's progress in this browser. One value, kept in localStorage,
 * shared between tabs. Components read it with useProgress() and change it
 * through the functions below; all the logic is in reduce.ts.
 */

export const PROGRESS_KEY = "jabr:progress";

let cache: Progress | null = null;
const listeners = new Set<() => void>();

function read(): Progress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return (raw && parseProgress(JSON.parse(raw))) || EMPTY_PROGRESS;
  } catch {
    // No storage (private mode) or unreadable data: start empty for this visit.
    return EMPTY_PROGRESS;
  }
}

export function getProgress(): Progress {
  cache ??= read();
  return cache;
}

function notify(): void {
  for (const listener of listeners) listener();
}

function commit(next: Progress): void {
  if (next === cache) return;
  cache = next;
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
  } catch {
    // Storage is full or blocked: progress still works until the tab closes.
  }
  notify();
}

export function subscribeToProgress(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab changed it.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== PROGRESS_KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function recordAttempt(input: AttemptInput): MasteryChange[] {
  const result = applyAttempt(getProgress(), input, Date.now());
  commit(result.progress);
  return result.changes;
}

export function recordReveal(
  input: Parameters<typeof applyReveal>[1],
): MasteryChange[] {
  const result = applyReveal(getProgress(), input, Date.now());
  commit(result.progress);
  return result.changes;
}

export function recordLessonStep(lessonKey: string, step: number): void {
  commit(applyLessonStep(getProgress(), lessonKey, step, Date.now()));
}

export function recordLessonCompleted(lessonKey: string): void {
  commit(applyLessonCompleted(getProgress(), lessonKey, Date.now()));
}

export function recordReview(conceptId: string, rating: ReviewRating): void {
  commit(applyReview(getProgress(), conceptId, rating, Date.now()));
}

export function recordGoal(contextId: string, interactiveId: string): void {
  commit(applyGoal(getProgress(), contextId, interactiveId, Date.now()));
}

/** Replaces everything, e.g. from an exported file. Returns false if it is not valid progress. */
export function importProgress(value: unknown): boolean {
  const parsed = parseProgress(value);
  if (!parsed) return false;
  commit(parsed);
  return true;
}

export function resetProgress(): void {
  commit(EMPTY_PROGRESS);
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function clearProgressCache(): void {
  cache = null;
}
