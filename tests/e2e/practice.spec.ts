import { expect, type Page, test } from "@playwright/test";

const lesson = "/courses/calculus-essentials/derivatives/what-is-a-derivative";
const explainer =
  "/explore/why-do-a-hammer-and-a-feather-fall-at-the-same-rate";

const question = (page: Page, id: string) =>
  page.locator(`[data-question="${id}"]`);

test.describe("answering questions", () => {
  test("a numeric question: wrong, hint, then right", async ({ page }) => {
    await page.goto(`${lesson}#step-2`);
    const card = question(page, "calc.deriv.slope-at-point");
    // "…tangent line to f(x) = x² at x = a": the slope is 2a.
    const prompt = await card.locator(".rich").first().innerText();
    const a = Number(
      /x\s*=\s*(-?[\d.]+)\s*\?/.exec(prompt.replace(/−/g, "-"))?.[1],
    );
    expect(Number.isFinite(a)).toBe(true);

    await card.getByRole("textbox").fill(String(2 * a + 1));
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/Not quite/)).toBeVisible();
    await expect(card).toHaveAttribute("data-status", "incorrect");

    await card.getByRole("button", { name: "Give me a hint" }).click();
    await expect(card.getByText("Hint 1 of 2")).toBeVisible();

    await card.getByRole("textbox").fill(String(2 * a));
    await card.getByRole("textbox").press("Enter");
    await expect(card.getByText(/Correct/)).toBeVisible();
    await expect(card).toHaveAttribute("data-status", "correct");
    await expect(card.getByText("Worked solution")).toBeVisible();
  });

  test("an expression question accepts any equivalent form", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    const card = question(page, "calc.deriv.definition-expression");
    await card.getByRole("textbox").fill("6x +");
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/doesn't read as maths/)).toBeVisible();

    await card.getByRole("textbox").fill("2 * 3x");
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText("Correct!")).toBeVisible();
  });

  test("a multiple-choice question explains a wrong pick", async ({ page }) => {
    await page.goto(`${lesson}#step-2`);
    const card = question(page, "calc.deriv.shrinking-h");
    await card.getByRole("radio").nth(1).check({ force: true });
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/That is the slope for/)).toBeVisible();

    await card.getByRole("radio").nth(0).check({ force: true });
    await card.getByRole("button", { name: /^Check/ }).click();
    await expect(card.getByText(/Correct/)).toBeVisible();
  });

  test("the solution can be revealed, and new numbers requested", async ({
    page,
  }) => {
    await page.goto(`${lesson}#step-2`);
    const card = question(page, "calc.deriv.secant-slope");
    const before = await card.locator(".rich").first().innerText();
    await card.getByRole("textbox").fill("0");
    await card.getByRole("button", { name: "Check" }).click();
    await card.getByRole("button", { name: "Show the solution" }).click();
    await expect(card.getByText("Answer:")).toBeVisible();

    // Seeds are random; a few tries make a repeat of the same numbers unlikely.
    await expect(async () => {
      await card.getByRole("button", { name: "New numbers" }).click();
      await expect(card.getByRole("textbox")).toHaveValue("");
      expect(await card.locator(".rich").first().innerText()).not.toBe(before);
    }).toPass();

    // The new numbers survive a reload.
    const after = await card.locator(".rich").first().innerText();
    await page.reload();
    await expect
      .poll(() => card.locator(".rich").first().innerText())
      .toBe(after);
  });

  test("a self-check compares with a model answer", async ({ page }) => {
    await page.goto(`${lesson}#step-3`);
    const card = question(page, "calc.deriv.units");
    await card
      .getByRole("textbox")
      .fill("The cyclist moves at 5 m/s at t = 2 s.");
    await card
      .getByRole("button", { name: /Compare with a model answer/ })
      .click();
    await card.getByRole("checkbox").first().check();
    await card.getByRole("checkbox").nth(1).check();
    await card.getByRole("button", { name: "Save my self-check" }).click();
    await expect(card.getByText("Saved: 2 of 3 points covered.")).toBeVisible();
  });

  test("answers never reach the browser before they are earned", async ({
    page,
  }) => {
    const bodies: string[] = [];
    page.on("response", async (response) => {
      const type = response.headers()["content-type"] ?? "";
      if (/html|javascript|json|x-component|text\/plain/.test(type)) {
        bodies.push(await response.text().catch(() => ""));
      }
    });
    await page.goto(`${lesson}#step-2`);
    const card = question(page, "calc.deriv.shrinking-h");
    await card.getByRole("radio").nth(2).check({ force: true });
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByText(/Not quite/)).toBeVisible();
    await page.waitForLoadState("networkidle");

    const everything = bodies.join("\n");
    expect(everything).toContain("average rate of change between");
    // Answer formulas, tolerances, which choice is right, and the feedback
    // for choices that were not picked all stay on the server.
    expect(everything).not.toContain("(b^2 - a^2) / (b - a)");
    expect(everything).not.toContain("y + m * 0.1");
    // (The bare word "tolerance" is fine: the projectile simulation has one.)
    expect(everything).not.toMatch(/"tolerance":\s*\{\s*"(absolute|relative)"/);
    expect(everything).not.toContain("commonMistakes");
    expect(everything).not.toMatch(/"correctChoiceIds":\s*\[/);
    expect(everything).not.toContain("That is the slope for");
    expect(everything).not.toMatch(/"correct":\s*true/);
  });
});

test.describe("code labs", () => {
  // Starting Python takes a few seconds, more on a cold CI machine.
  test.slow();

  test("a graded lab fails, is fixed, and passes", async ({ page }) => {
    await page.goto(`${lesson}#step-2`);
    const lab = page.locator('[data-codelab="calc.deriv.code-slope"]');
    await lab.getByRole("button", { name: "Run and check" }).click();
    await expect(lab.getByText("0 of 3 checks passed")).toBeVisible({
      timeout: 90_000,
    });
    await expect(
      lab.getByText("the slope should be 3 everywhere"),
    ).toBeVisible();

    // Write the solution in place of the starter.
    await lab.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(
      "def secant_slope(f, x, h):\n    return (f(x + h) - f(x)) / h\n\nprint(secant_slope(lambda x: x**3, 2, 0.001))\n",
    );
    // (Ctrl/⌘+Enter also runs it, but phones have no such key.)
    await lab.getByRole("button", { name: "Run and check" }).click();
    await expect(lab.getByText("All checks passed. Nice work!")).toBeVisible({
      timeout: 60_000,
    });
    await expect(lab.getByTestId("codelab-output")).toContainText("12.006");

    // The learner's code is still there after a reload; Reset brings the starter back.
    await page.reload();
    await expect(lab.locator(".cm-content")).toContainText(
      "return (f(x + h) - f(x)) / h",
    );
    await lab.getByRole("button", { name: "Reset" }).click();
    await expect(lab.locator(".cm-content")).toContainText("return 0");
  });

  test("errors point at the line, and a runaway program can be stopped", async ({
    page,
  }) => {
    await page.goto(`${explainer}#build`);
    const lab = page.locator('[data-codelab="fall.sim"]');
    const write = async (code: string) => {
      await lab.locator(".cm-content").click();
      await page.keyboard.press("ControlOrMeta+A");
      await page.keyboard.insertText(code);
    };

    await write("x = 1\nprint(y)\n");
    await lab.getByRole("button", { name: "Run" }).click();
    await expect(lab.getByText("NameError on line 2")).toBeVisible({
      timeout: 90_000,
    });

    await write("while True:\n    pass\n");
    await lab.getByRole("button", { name: "Run" }).click();
    await lab.getByRole("button", { name: "Stop" }).click();
    await expect(lab.getByText("Stopped.")).toBeVisible();

    // Python comes back after being stopped.
    await write('print("still here")\n');
    await lab.getByRole("button", { name: "Run" }).click();
    await expect(lab.getByTestId("codelab-output")).toHaveText("still here", {
      timeout: 60_000,
    });
  });

  test("numpy and matplotlib work, and plots are shown", async ({ page }) => {
    await page.goto(`${explainer}#build`);
    const lab = page.locator('[data-codelab="fall.sim"]');
    await lab.locator(".cm-content").click();
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.insertText(
      'import numpy as np\nimport matplotlib.pyplot as plt\nt = np.linspace(0, 2, 50)\nplt.plot(t, 0.5 * 9.81 * t**2)\nplt.show()\nprint("points:", len(t))\n',
    );
    await lab.getByRole("button", { name: "Run" }).click();
    // The first run downloads numpy and matplotlib from the Pyodide CDN.
    await expect(lab.getByTestId("codelab-output")).toHaveText("points: 50", {
      timeout: 150_000,
    });
    const plot = lab.getByRole("img", { name: /Plot 1/ });
    await expect(plot).toBeVisible();
    expect(
      await plot.evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBeGreaterThan(200);
  });
});

test.describe("simulations", () => {
  test.use({ reducedMotion: "reduce" }); // results appear without animation

  test("the landing page target can be hit", async ({ page }) => {
    await page.goto("/");
    const sim = page.locator('[data-interactive="projectile-sim"]');
    const status = sim.getByTestId("projectile-status");
    await expect(status).toHaveText("Land the ball on the flag at 62 m.");

    // Retried: a click can land before the page's scripts have attached.
    await expect(async () => {
      await sim.getByRole("button", { name: "Launch" }).click();
      await expect(status).toContainText("short", { timeout: 1000 });
    }).toPass();

    // 25 m/s at 38° lands at 61.8 m.
    await sim.getByRole("slider", { name: /Launch speed/ }).fill("25");
    await sim.getByRole("slider", { name: /Launch angle/ }).fill("38");
    await sim.getByRole("button", { name: "Launch" }).click();
    await expect(status).toContainText("Bullseye! It landed at 61.8 m");
  });

  test("sliders work from the keyboard", async ({ page }) => {
    await page.goto("/");
    const speed = page.getByRole("slider", { name: /Launch speed/ });
    // Retried: a key press can land before the page's scripts have attached.
    await expect(async () => {
      await speed.focus();
      await page.keyboard.press("ArrowRight");
      const value = Number(await speed.inputValue());
      expect(value).toBeGreaterThan(18);
      await expect(speed).toHaveAttribute("aria-valuetext", `${value} m/s`, {
        timeout: 1000,
      });
    }).toPass();
  });

  test("the hammer and feather tie on the Moon and not in air", async ({
    page,
  }) => {
    await page.goto(explainer);
    const sim = page.locator('[data-interactive="drop-test"]');
    await expect(async () => {
      await sim.getByRole("button", { name: /Drop/ }).click();
      await expect(sim.getByText(/A tie/)).toBeVisible({ timeout: 1000 });
    }).toPass();

    await sim.getByText("Earth", { exact: true }).click();
    await sim.getByRole("switch", { name: /Air/ }).check({ force: true });
    await sim.getByRole("button", { name: /Drop/ }).click();
    await expect(sim.getByTestId("drop-hammer")).toHaveText("0.57 s");
    await expect(sim.getByTestId("drop-feather")).toHaveText("1.05 s");
  });

  test("more Euler steps shrink the error until the goal is met", async ({
    page,
  }) => {
    await page.goto(`${explainer}#build`);
    const sim = page.locator('[data-interactive="euler-stepper"]');
    await expect(sim.getByTestId("euler-error")).toHaveText("1.044");
    await sim.getByRole("slider", { name: /Number of steps/ }).fill("32");
    await expect(sim.getByText("Done: 32 steps is enough.")).toBeVisible();
  });
});
