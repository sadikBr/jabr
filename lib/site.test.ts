import { describe, expect, it } from "vitest";

import messages from "@/messages/en.json";

import { isActivePath, navItems } from "./site";

describe("isActivePath", () => {
  it("matches a section and the pages under it", () => {
    expect(isActivePath("/courses", "/courses")).toBe(true);
    expect(isActivePath("/courses/calculus-essentials", "/courses")).toBe(true);
  });

  it("does not match a different section with the same prefix", () => {
    expect(isActivePath("/courses-old", "/courses")).toBe(false);
  });

  it("matches home only exactly", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/explore", "/")).toBe(false);
  });
});

describe("navItems", () => {
  it("has a label for every item", () => {
    for (const { key } of navItems) {
      expect(messages.nav[key]).toBeTruthy();
    }
  });
});
