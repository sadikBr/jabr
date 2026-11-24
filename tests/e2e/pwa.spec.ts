import { expect, test } from "./fixtures";

test.describe("installable app", () => {
  test("links a manifest that meets the install criteria", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const href = await page
      .locator('link[rel="manifest"]')
      .getAttribute("href");
    expect(href).toBeTruthy();

    const manifest = await (await request.get(href!)).json();
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBe("Jabr");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    expect(
      manifest.icons.some(
        (icon: { purpose?: string }) => icon.purpose === "maskable",
      ),
    ).toBe(true);

    for (const icon of manifest.icons as { src: string }[]) {
      const response = await request.get(icon.src);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()["content-type"]).toBe("image/png");
    }
    for (const shortcut of manifest.shortcuts as { url: string }[]) {
      expect((await request.get(shortcut.url)).status(), shortcut.url).toBe(
        200,
      );
    }
  });

  test("declares Apple touch icon and launch images that exist", async ({
    page,
    request,
  }) => {
    await page.goto("/");
    const touchIcon = await page
      .locator('link[rel="apple-touch-icon"]')
      .first()
      .getAttribute("href");
    expect((await request.get(touchIcon!)).status()).toBe(200);

    const splash = page.locator('link[rel="apple-touch-startup-image"]');
    expect(await splash.count()).toBeGreaterThan(0);
    const first = await splash.first().getAttribute("href");
    expect((await request.get(first!)).status()).toBe(200);
  });
});
