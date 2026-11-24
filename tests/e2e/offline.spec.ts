import { choose, expect, test } from "./fixtures";

const lesson = "/courses/calculus-essentials/derivatives/what-is-a-derivative";

test.describe("offline", () => {
  test("opened pages, their links and their interactives work without a connection", async ({
    page,
    context,
  }) => {
    await page.goto(lesson);
    // Wait for the service worker to take control and save this page.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect
      .poll(
        () =>
          page.evaluate(async (path) => {
            const cache = await caches.open("jabr-pages-v1");
            return !!(await cache.match(path));
          }, lesson),
        { timeout: 20_000 },
      )
      .toBe(true);
    // Reload once so every file is requested under the worker's control.
    await page.reload();
    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const cache = await caches.open("jabr-pages-v1");
            return !!(await cache.match("/courses/calculus-essentials"));
          }),
        { timeout: 20_000 },
      )
      .toBe(true);

    await context.setOffline(true);

    // The page itself, and its simulation.
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "What is a derivative?",
    );
    await page.getByRole("button", { name: "Zoom in ×10" }).click();
    await expect(page.getByTestId("secant-slope")).toHaveText("2.1");

    // Questions need the server, and say so.
    await page.getByRole("button", { name: /Step 2 of 4/ }).click();
    const card = page.locator('[data-question="calc.deriv.shrinking-h"]');
    await choose(card.getByRole("radio").first());
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/You're offline/)).toBeVisible();

    // A page this one links to was saved too.
    await page.goto("/courses/calculus-essentials");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Calculus essentials",
    );

    // A page that was never opened or linked shows the offline page.
    await page.goto("/explore/how-does-a-calculator-compute-sin");
    await expect(
      page.getByRole("heading", { name: "You're offline" }),
    ).toBeVisible();
  });
});
