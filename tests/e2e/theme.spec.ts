import { expect, test } from "@playwright/test";

const html = "html";

test.describe("theme", () => {
  test("follows the system colour scheme by default", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator(html)).toHaveAttribute("data-theme", "dark");

    await page.emulateMedia({ colorScheme: "light" });
    await expect(page.locator(html)).toHaveAttribute("data-theme", "light");
  });

  test("a chosen theme changes the page and survives a reload", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Switch theme/ });
    const background = () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const lightBackground = await background();

    await toggle.click(); // system → light
    await toggle.click(); // light → dark
    await expect(page.locator(html)).toHaveAttribute("data-theme", "dark");
    expect(await background()).not.toBe(lightBackground);

    await page.reload();
    await expect(page.locator(html)).toHaveAttribute("data-theme", "dark");
    await expect(toggle).toHaveAccessibleName(/Theme: Dark/);
  });
});
