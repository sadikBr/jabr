import { expect, test } from "@playwright/test";

const sections = [
  { name: "Explore", path: "/explore" },
  { name: "Courses", path: "/courses" },
  { name: "Projects", path: "/projects" },
] as const;

test("landing page shows the three entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Understand how things work",
  );
  for (const { name } of sections) {
    await expect(
      page.getByRole("main").getByRole("link", { name: new RegExp(name) }),
    ).not.toHaveCount(0);
  }
});

test("main navigation reaches every section", async ({ page }) => {
  await page.goto("/");
  // Desktop shows the header nav, phones the bottom tab bar; one is visible.
  const nav = page.getByRole("navigation", { name: "Main navigation" });
  for (const { name, path } of sections) {
    await nav.getByRole("link", { name }).filter({ visible: true }).click();
    await expect(page).toHaveURL(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect(
      nav.getByRole("link", { name }).filter({ visible: true }),
    ).toHaveAttribute("aria-current", "page");
  }
});

test("pages do not scroll sideways", async ({ page }) => {
  for (const path of ["/", ...sections.map((s) => s.path)]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );
    expect(overflow, path).toBeLessThanOrEqual(0);
  }
});

test("skip link is the first focus stop", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
});

test("unknown routes show the not-found page", async ({ page }) => {
  const response = await page.goto("/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Page not found",
  );
});
