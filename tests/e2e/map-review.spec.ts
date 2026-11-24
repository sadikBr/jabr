import { expect, type Page, reviewCard, seedProgress, test } from "./fixtures";

const lesson = "/courses/calculus-essentials/derivatives/what-is-a-derivative";

/**
 * Answers whichever of the lesson's randomised questions is on screen. The
 * numbers are read from the TeX source KaTeX keeps beside each formula,
 * which is exact (the visible text splits a minus sign from its digits).
 */
async function answerCorrectly(page: Page) {
  const card = page.locator("[data-question]");
  const id = await card.getAttribute("data-question");
  const tex = await card
    .locator(".rich")
    .first()
    .locator("annotation")
    .allTextContents();
  const numbers = tex
    .join(" ; ")
    .match(/-?\d+(?:\.\d+)?/g)!
    .map(Number);
  let answer: number;
  if (id === "calc.deriv.slope-at-point") {
    // "f(x) = x^2 ; x = a" → the slope is 2a
    answer = 2 * numbers.at(-1)!;
  } else if (id === "calc.deriv.tangent-prediction") {
    // "(2, y) ; m ; x = 2.1" → y + 0.1 m
    const [, y, m] = numbers;
    answer = y! + 0.1 * m!;
  } else {
    throw new Error(`Unexpected review question ${id}`);
  }
  await card.getByRole("textbox").fill(answer.toFixed(3));
  await card.getByRole("button", { name: "Check" }).click();
  await expect(card.getByText("Correct!")).toBeVisible();
}

test.describe("knowledge map", () => {
  test("shows every concept, coloured by mastery, with what is ready next", async ({
    page,
  }) => {
    await seedProgress(page, {
      mastery: {
        functions: 0.9,
        "slope-of-a-line": 0.5,
        "limits-intuition": 0.1,
      },
    });
    await page.goto("/map");
    const map = page.getByTestId("concept-map");
    await expect(map.locator("[data-concept]")).toHaveCount(23);
    await expect(map.locator(".react-flow__edge")).toHaveCount(29);

    await expect(map.locator('[data-concept="functions"]')).toHaveAttribute(
      "data-mastery",
      "mastered",
    );
    await expect(
      map.locator('[data-concept="slope-of-a-line"]'),
    ).toHaveAttribute("data-mastery", "practicing");
    await expect(
      map.locator('[data-concept="limits-intuition"]'),
    ).toHaveAttribute("data-mastery", "learning");
    await expect(map.locator('[data-concept="chain-rule"]')).toHaveAttribute(
      "data-mastery",
      "new",
    );

    // Status is in the accessible name, not just the colour, and so is
    // "ready to learn" for a concept whose prerequisites are in hand.
    await expect(
      map.getByRole("link", {
        name: "Average rate of change (Not started, Ready to learn)",
      }),
    ).toBeVisible();
    await expect(
      map.getByRole("link", { name: "Functions (Mastered)" }),
    ).toBeVisible();

    const legend = page.getByTestId("map-legend");
    await expect(legend).toContainText(/Mastered\s*1/);
    await expect(legend).toContainText(/Not started\s*20/);
  });

  test("highlights a subject, lists the concepts, and opens a concept", async ({
    page,
  }) => {
    await page.goto("/map");
    const map = page.getByTestId("concept-map");
    await page.getByRole("button", { name: "Physics" }).click();
    await expect(page.getByTestId("map-legend")).toContainText(
      /Not started\s*8/,
    );
    await expect(map.locator('[data-concept="velocity"]')).not.toHaveClass(
      /opacity-25/,
    );
    await expect(map.locator('[data-concept="chain-rule"]')).toHaveClass(
      /opacity-25/,
    );

    // The same thing as a list, for anyone who prefers that to a canvas.
    await page.getByRole("button", { name: "List" }).click();
    await expect(page.getByRole("heading", { name: "Physics" })).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /Velocity/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("main").getByRole("link", { name: /Chain rule/ }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: "Map" }).click();
    await page.getByRole("button", { name: "Everything" }).click();
    await map.locator('[data-concept="derivative-definition"]').click();
    await expect(page).toHaveURL("/concepts/derivative-definition");
    await page.getByRole("link", { name: "See it on the map" }).click();
    await expect(page).toHaveURL("/map#derivative-definition");
    await expect(
      page
        .getByTestId("concept-map")
        .locator('[data-concept="derivative-definition"]'),
    ).toBeInViewport();
  });

  test("fits a phone without the page scrolling sideways", async ({ page }) => {
    await page.goto("/map");
    await expect(
      page.getByTestId("concept-map").locator("[data-concept]").first(),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("review", () => {
  test("explains itself when there is nothing to review", async ({ page }) => {
    await page.goto("/review");
    await expect(
      page.getByRole("heading", { name: "Nothing to review yet" }),
    ).toBeVisible();
  });

  test("mastering a concept schedules its first review", async ({ page }) => {
    // One correct answer away from mastery (0.75 → 0.825).
    await seedProgress(page, { mastery: { "derivative-definition": 0.75 } });
    await page.goto(`${lesson}#step-2`);
    const card = page.locator('[data-question="calc.deriv.shrinking-h"]');
    await card.getByRole("radio").first().check({ force: true });
    await card.getByRole("button", { name: "Check" }).click();
    await expect(card.getByTestId("mastery-changes")).toContainText(
      "Mastered!",
    );

    await page.goto("/review");
    await expect(
      page.getByRole("heading", { name: "All caught up" }),
    ).toBeVisible();
    await expect(
      page.getByText("Your next review is in 3 days."),
    ).toBeVisible();
  });

  test("a due concept is reviewed and comes back later", async ({ page }) => {
    await seedProgress(page, {
      mastery: { "derivative-definition": 0.9, "tangent-line": 0.85 },
      reviews: {
        "derivative-definition": reviewCard(-1),
        "tangent-line": reviewCard(2),
      },
    });
    await page.goto("/dashboard");
    await expect(page.getByTestId("review-card")).toContainText(
      "1 concept to review",
    );
    await page.getByTestId("review-card").click();

    await expect(
      page.getByRole("heading", { name: "1 concept is due" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Start review" }).click();

    // Two questions on the concept, with freshly chosen numbers.
    const next = page.getByRole("button", { name: "Next question" });
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
    await expect(next).toBeDisabled();
    await answerCorrectly(page);
    await next.click();
    await expect(page.getByText("Question 2 of 2")).toBeVisible();
    await answerCorrectly(page);
    await page.getByRole("button", { name: "Finish review" }).click();

    await expect(
      page.getByRole("heading", { name: "Review complete" }),
    ).toBeVisible();
    const results = page.getByTestId("review-results");
    await expect(results).toContainText("The derivative as a rate of change");
    await expect(results).toContainText("Solid");
    await expect(results).toContainText(/Back in \d+ days/);

    // Nothing is due any more, and that survives a reload.
    await page.goto("/dashboard");
    await expect(page.getByTestId("review-card")).toContainText("Nothing due");
    await page.reload();
    await expect(page.getByTestId("review-card")).toContainText("Nothing due");
  });

  test("a concept that was forgotten comes back sooner", async ({ page }) => {
    await seedProgress(page, {
      mastery: { "derivative-definition": 0.9 },
      reviews: { "derivative-definition": reviewCard(-1) },
    });
    await page.goto("/review");
    await page.getByRole("button", { name: "Start review" }).click();

    for (const last of [false, true]) {
      const card = page.locator("[data-question]");
      await card.getByRole("textbox").fill("12345");
      await card.getByRole("button", { name: "Check" }).click();
      await card.getByRole("button", { name: "Show the solution" }).click();
      await page
        .getByRole("button", { name: last ? "Finish review" : "Next question" })
        .click();
    }
    const results = page.getByTestId("review-results");
    await expect(results).toContainText("Needs another look");
    // Back within a few days, not weeks.
    const days = Number(
      /Back in (\d+) days|Back tomorrow/.exec(await results.innerText())?.[1] ??
        1,
    );
    expect(days).toBeLessThanOrEqual(3);
  });

  test("a review can be done early", async ({ page }) => {
    await seedProgress(page, {
      mastery: { "derivative-definition": 0.9 },
      reviews: { "derivative-definition": reviewCard(5) },
    });
    await page.goto("/review");
    await expect(
      page.getByText("Your next review is in 5 days."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Review early anyway" }).click();
    await expect(page.getByText("Question 1 of 2")).toBeVisible();
  });
});

test.describe("what to learn", () => {
  test("a lesson points out prerequisites that are still weak", async ({
    page,
  }) => {
    await seedProgress(page, {
      mastery: { "limits-intuition": 0.5, "average-rate-of-change": 0.1 },
    });
    await page.goto(lesson);
    const panel = page.getByTestId("prerequisites");
    await expect(
      panel.getByRole("link", { name: /Limits, intuitively \(Practicing\)/ }),
    ).toBeVisible();
    await expect(panel).toContainText("Some of these are new to you");
    await expect(
      panel.getByRole("link", {
        name: /Average rate of change: Read about it/,
      }),
    ).toBeVisible();
    await expect(
      panel.getByRole("link", { name: /Limits, intuitively:/ }),
    ).toHaveCount(0);
    await panel
      .getByRole("link", { name: /Slope of a line: Read about it/ })
      .click();
    await expect(page).toHaveURL("/concepts/slope-of-a-line");
  });

  test("a lesson stays quiet about prerequisites for a newcomer", async ({
    page,
  }) => {
    await page.goto(lesson);
    const panel = page.getByTestId("prerequisites");
    await expect(
      panel.getByRole("link", { name: "Slope of a line (Not started)" }),
    ).toBeVisible();
    await expect(panel).not.toContainText("new to you");
  });

  test("a lesson says so when everything it builds on is in hand", async ({
    page,
  }) => {
    await seedProgress(page, {
      mastery: {
        "limits-intuition": 0.5,
        "average-rate-of-change": 0.4,
        "slope-of-a-line": 0.9,
      },
    });
    await page.goto(lesson);
    await expect(page.getByTestId("prerequisites")).toContainText(
      "You're practising everything this lesson builds on.",
    );
  });

  test("projects show how ready the learner is and what to learn first", async ({
    page,
  }) => {
    await seedProgress(page, {
      mastery: { "eulers-method": 0.5, velocity: 0.9, acceleration: 0.4 },
    });
    await page.goto("/projects");
    const rocket = page
      .locator("#rocket-flight-simulator")
      .getByTestId("project-readiness");
    // 3 of the rocket simulator's 6 concepts are being practised.
    await expect(rocket).toContainText("Ready for 50% of what it needs");
    await expect(rocket.getByRole("link", { name: "Air drag" })).toBeVisible();
    await expect(rocket.getByRole("link", { name: "Velocity" })).toHaveCount(0);
  });
});
