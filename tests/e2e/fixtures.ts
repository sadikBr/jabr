import { expect, type Locator, test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

/**
 * Ticks a radio button, checkbox or switch from the keyboard. The real inputs
 * are visually hidden behind their styled labels, so a mouse click aimed at
 * one can land on whatever is drawn over that spot instead: on a phone, the
 * fixed bar at the bottom of the screen. The keyboard has no such problem.
 */
export async function choose(option: Locator) {
  // Like `check()`: leave it alone if it is already ticked.
  if (!(await option.isChecked())) await option.press("Space");
  await expect(option).toBeChecked();
}

/**
 * `page.goto` and `page.reload` here also wait until the page is interactive
 * (the `data-hydrated` marker set by components/layout/hydration-marker.tsx).
 * Without that, a click or key press sent the instant the HTML arrives can
 * land before the page's scripts have attached and be lost.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const ready = () =>
      page.waitForSelector("html[data-hydrated]", { state: "attached" });
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await ready();
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await ready();
      return response;
    };
    await provide(page);
  },
});

const DAY = 86_400_000;

/** A review card as the app stores it, due `dueInDays` from now. */
export function reviewCard(dueInDays: number) {
  const now = Date.now();
  return {
    due: now + dueInDays * DAY,
    fsrs: {
      stability: 2.3,
      difficulty: 2.1,
      elapsed_days: 0,
      scheduled_days: 3,
      reps: 1,
      lapses: 0,
      learning_steps: 0,
      state: 2,
      last_review: now - 3 * DAY,
    },
  };
}

/**
 * Starts the browser with saved progress, as if the learner had used the app
 * before. Only set when nothing is stored yet, so what the app saves during
 * the test survives a reload.
 */
export async function seedProgress(
  page: import("@playwright/test").Page,
  progress: {
    mastery?: Record<string, number>;
    reviews?: Record<string, ReturnType<typeof reviewCard>>;
    completedLessons?: string[];
  },
) {
  const now = Date.now();
  const value = {
    version: 1,
    mastery: Object.fromEntries(
      Object.entries(progress.mastery ?? {}).map(([id, score]) => [
        id,
        { score, updatedAt: now, masteredAt: score >= 0.8 ? now : undefined },
      ]),
    ),
    questions: {},
    lessons: Object.fromEntries(
      (progress.completedLessons ?? []).map((key) => [
        key,
        {
          status: "completed",
          lastStep: 0,
          startedAt: now,
          updatedAt: now,
          completedAt: now,
        },
      ]),
    ),
    goals: {},
    reviews: progress.reviews ?? {},
    attempts: [],
    events: [],
  };
  await page.addInitScript((json) => {
    if (!localStorage.getItem("jabr:progress")) {
      localStorage.setItem("jabr:progress", json);
    }
  }, JSON.stringify(value));
}
