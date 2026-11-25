import { choose, expect, type Page, test } from "./fixtures";

const course = "/courses/python-for-scientists";
const lessons = [
  `${course}/basics/numbers-and-names`,
  `${course}/basics/functions`,
  `${course}/basics/loops-and-decisions`,
  `${course}/basics/lists`,
  `${course}/scientific-python/numpy-arrays`,
  `${course}/scientific-python/plotting`,
  `${course}/scientific-python/simulation-loop`,
];

const lab = (page: Page, id: string) =>
  page.locator(`[data-codelab="${id}"]`).filter({ visible: true });

/** Replaces everything in a lab's editor with `code`. */
async function write(page: Page, id: string, code: string) {
  await lab(page, id).locator(".cm-content").click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(code);
}

test.describe("python for scientists", () => {
  test("the course is in the catalog, third, with all seven lessons ready", async ({
    page,
  }) => {
    await page.goto("/courses");
    const titles = page.getByRole("main").getByRole("heading", { level: 2 });
    await expect(titles).toHaveText([
      "Calculus essentials",
      "Classical mechanics",
      "Python for scientists",
    ]);

    await page.goto(course);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Python for scientists",
    );
    await expect(page.getByText("Coming soon")).toHaveCount(0);
    await expect(page.locator("[data-lesson-state]")).toHaveCount(7);
  });

  test("every lesson fits the screen at each step", async ({ page }) => {
    test.slow();
    for (const url of lessons) {
      await page.goto(url);
      await expect(page.getByText("This lesson is being written")).toHaveCount(
        0,
      );
      const steps = await page
        .getByRole("button", { name: /^Step \d+ of \d+/ })
        .count();
      expect(steps, url).toBe(4);
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

  test("a question shows its program as a block of code", async ({ page }) => {
    await page.goto(`${lessons[0]}#step-2`);
    const card = page.locator('[data-question="py.vars.update"]');
    await expect(card.locator("pre")).toHaveText("x = 5\nx = x + 2\nprint(x)");

    await choose(card.getByRole("radio", { name: "5", exact: true }));
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/The second line changes/)).toBeVisible();
  });

  test.describe("running Python", () => {
    // Starting Python takes a few seconds, more on a cold CI machine.
    test.slow();

    test("the first program runs, and a changed one gives a new answer", async ({
      page,
    }) => {
      await page.goto(lessons[0]!);
      const playground = lab(page, "py.vars.playground");
      await playground.getByRole("button", { name: "Run" }).click();
      // ½ × 9.8 × 3²
      await expect(playground.getByTestId("codelab-output")).toContainText(
        "44.1",
        { timeout: 90_000 },
      );

      await write(
        page,
        "py.vars.playground",
        "g = 1.62\nt = 3\nprint(0.5 * g * t**2)\n",
      );
      await playground.getByRole("button", { name: "Run" }).click();
      await expect(playground.getByTestId("codelab-output")).toContainText(
        "7.29",
        { timeout: 60_000 },
      );
    });

    test("a lab checks variables the program defines", async ({ page }) => {
      await page.goto(`${lessons[0]}#step-2`);
      const energy = lab(page, "py.vars.code-energy");
      await energy.getByRole("button", { name: "Run and check" }).click();
      // The starter's `energy = 0` fails two checks and happens to pass one.
      await expect(energy.getByText("1 of 3 checks passed")).toBeVisible({
        timeout: 90_000,
      });

      await write(
        page,
        "py.vars.code-energy",
        'mass = 1200\nspeed = 25\nenergy = 0.5 * mass * speed**2\nprint("Kinetic energy:", energy, "joules")\n',
      );
      await energy.getByRole("button", { name: "Run and check" }).click();
      await expect(
        energy.getByText("All checks passed. Nice work!"),
      ).toBeVisible({ timeout: 60_000 });
      await expect(energy.getByTestId("codelab-output")).toContainText(
        "375000.0 joules",
      );
    });
  });
});
