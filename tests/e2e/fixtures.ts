import { test as base } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

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
