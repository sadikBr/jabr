import { describe, expect, it } from "vitest";

import { daysBetween } from "./dashboard-view";

const at = (iso: string) => new Date(iso).getTime();

describe("daysBetween", () => {
  it("counts calendar days, not 24-hour periods", () => {
    // Late one evening to early the next morning is "yesterday".
    expect(
      daysBetween(at("2026-03-10T23:50:00"), at("2026-03-11T00:10:00")),
    ).toBe(1);
    expect(
      daysBetween(at("2026-03-10T00:05:00"), at("2026-03-10T23:55:00")),
    ).toBe(0);
    expect(
      daysBetween(at("2026-03-01T12:00:00"), at("2026-03-11T08:00:00")),
    ).toBe(10);
  });

  it("never goes negative if the clock moved backwards", () => {
    expect(
      daysBetween(at("2026-03-12T12:00:00"), at("2026-03-10T12:00:00")),
    ).toBe(0);
  });
});
