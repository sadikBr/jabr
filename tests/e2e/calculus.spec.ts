import { expect, type Page, test } from "./fixtures";

const course = "/courses/calculus-essentials";
const lessons = {
  rates: `${course}/change-and-limits/rates-of-change-from-data`,
  limits: `${course}/change-and-limits/limits-intuition`,
  continuity: `${course}/change-and-limits/continuity`,
  rules: `${course}/derivatives/derivative-rules`,
  motion: `${course}/derivatives/derivatives-in-motion`,
  euler: `${course}/numerical-methods/eulers-method`,
};

const question = (page: Page, id: string) =>
  page.locator(`[data-question="${id}"]`);
const interactive = (page: Page, id: string) =>
  page.locator(`[data-interactive="${id}"]`).filter({ visible: true });

/** Presses an arrow key on a slider `times` times: negative goes left. */
async function nudge(
  page: Page,
  slider: ReturnType<Page["getByRole"]>,
  times: number,
) {
  await slider.focus();
  for (let i = 0; i < Math.abs(times); i++) {
    await page.keyboard.press(times > 0 ? "ArrowRight" : "ArrowLeft");
  }
}

test.describe("calculus essentials", () => {
  test("every lesson is ready and fits the screen at each step", async ({
    page,
  }) => {
    test.slow();
    for (const url of Object.values(lessons)) {
      await page.goto(url);
      await expect(page.getByText("This lesson is being written")).toHaveCount(
        0,
      );
      const steps = await page
        .getByRole("button", { name: /^Step \d+ of \d+/ })
        .count();
      expect(steps, url).toBeGreaterThanOrEqual(4);
      for (let step = 1; step <= steps; step++) {
        await page.goto(`${url}#step-${step}`);
        await expect(
          page.getByRole("heading", { level: 2 }).filter({ visible: true }),
        ).toHaveCount(1);
        const overflow = await page.evaluate(
          () =>
            document.documentElement.scrollWidth -
            document.documentElement.clientWidth,
        );
        expect(overflow, `${url}#step-${step}`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("the sprint data gives up its fastest stretch", async ({ page }) => {
    await page.goto(lessons.rates);
    const explorer = interactive(page, "secant-explorer");
    const speed = explorer.getByTestId("secant-explorer-slope");
    await expect(speed).toHaveText("10.44 m/s");
    await expect(
      explorer.getByText("Find the stretch where the average speed"),
    ).toBeVisible();

    // From the whole race down to the stretch between 60 m and 70 m.
    await nudge(page, explorer.getByRole("slider", { name: "End" }), -3);
    await nudge(page, explorer.getByRole("slider", { name: "Start" }), 6);
    await expect(speed).toHaveText("12.35 m/s");
    await expect(
      explorer.getByText("Found it: 12.35 m/s between 6.29 s and 7.1 s."),
    ).toBeVisible();
  });

  test("a question shows a table worked out from its random numbers", async ({
    page,
  }) => {
    await page.goto(`${lessons.rates}#step-2`);
    const card = question(page, "calc.rates.table");
    // The distances are in the TeX source KaTeX keeps beside the table.
    const tex = (
      await card
        .locator(".rich")
        .first()
        .locator("annotation")
        .allTextContents()
    ).join(" ");
    const row = /distance \(m\)\}((?:\s*&\s*\d+)+)/.exec(tex)?.[1] ?? "";
    const distances = [...row.matchAll(/\d+/g)].map(Number);
    expect(distances).toHaveLength(4);
    const [, at10, , at30] = distances as [number, number, number, number];

    await card.getByRole("textbox").fill(String(at30 / 30));
    await card.getByRole("button", { name: "Check" }).click();
    await expect(
      card.getByText("That is her average over the whole 30 s."),
    ).toBeVisible();

    await card.getByRole("textbox").fill(String((at30 - at10) / 20));
    await card.getByRole("textbox").press("Enter");
    await expect(card.getByText(/Correct/)).toBeVisible();
  });

  test("closing in on a hole finds the limit", async ({ page }) => {
    await page.goto(lessons.limits);
    const explorer = interactive(page, "limit-explorer").first();
    await expect(explorer.locator(".katex").first()).toBeVisible();
    await expect(explorer.getByTestId("limit-verdict")).toHaveCount(0);
    await expect(explorer.getByTestId("limit-value-at-point")).toHaveText(
      "not defined",
    );

    const closer = explorer.getByRole("button", { name: "10× closer" });
    await closer.click();
    await closer.click();
    await closer.click();
    await expect(explorer.getByRole("row", { name: /^0.001 / })).toContainText(
      "1.999",
    );
    await expect(explorer.getByTestId("limit-verdict")).toContainText(
      "From both sides the values close in on 2.",
    );
  });

  test("the continuity explorer runs the three tests", async ({ page }) => {
    await page.goto(lessons.continuity);
    const explorer = interactive(page, "limit-explorer");
    await explorer.getByText("Jump", { exact: true }).click();
    await nudge(
      page,
      explorer.getByRole("slider", { name: /Distance from/ }),
      12,
    );
    await expect(explorer.getByText("Not continuous at x = 2.")).toBeVisible();
    await expect(explorer.getByText("The limit at x = 2 exists")).toBeVisible();
  });

  test("dragging across the curve traces its derivative", async ({ page }) => {
    await page.goto(lessons.rules);
    const explorer = interactive(page, "derivative-explorer");
    await expect(explorer.getByText(/0% traced/)).toBeVisible();

    const graph = explorer.getByTestId("derivative-trace");
    await graph.scrollIntoViewIfNeeded();
    const box = (await graph.boundingBox())!;
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 2, y, { steps: 30 });
    await page.mouse.up();

    await expect(
      explorer.getByText("Traced. The derivative of x² is 2x."),
    ).toBeVisible();
    await expect(explorer.getByTestId("derivative-slope")).toHaveText("6");
  });

  test("a thrown ball lands as fast as it left, and stops at the top", async ({
    page,
  }) => {
    await page.goto(lessons.motion);
    const explorer = interactive(page, "motion-graphs");
    const velocity = explorer.getByTestId("motion-velocity");
    await expect(velocity).toHaveText("15 m/s");

    await explorer.getByRole("button", { name: "Throw" }).click();
    // The flight takes about three seconds.
    await expect(velocity).toHaveText("-15 m/s", { timeout: 10_000 });
    await expect(explorer.getByTestId("motion-height")).toHaveText("0 m");

    // Drag the clock to the middle of the flight: the top.
    const time = explorer.getByRole("slider", { name: "Time" });
    await time.fill("1.53");
    await expect(explorer.getByText(/That's the top/)).toBeVisible();
    await expect(velocity).toHaveText("0.01 m/s");
  });

  test("finishing a lesson moves the course on to the next one", async ({
    page,
  }) => {
    await page.goto(`${lessons.rates}#step-4`);
    await page.getByRole("button", { name: "Finish lesson" }).click();
    await expect(
      page.getByRole("heading", { level: 2 }).filter({ visible: true }),
    ).toHaveText("That's the lesson!");

    await page.goto(course);
    await expect(page.getByText("1 of 7 lessons finished")).toBeVisible();
    const next = page.getByTestId("continue-card");
    await expect(next).toContainText("Limits, intuitively");
  });
});
