import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { THEME_STORAGE_KEY } from "@/lib/theme";
import { renderWithIntl } from "@/tests/unit/render";

import { ThemeToggle } from "./theme-toggle";

function mockSystemTheme(dark: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: dark,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    mockSystemTheme(false);
  });

  it("starts on the system preference", () => {
    renderWithIntl(<ThemeToggle />);
    expect(
      screen.getByRole("button", { name: /Theme: System/ }),
    ).toBeInTheDocument();
  });

  it("cycles light → dark → system, applying and storing each choice", () => {
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("light");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(button).toHaveAccessibleName(/Theme: Dark/);

    fireEvent.click(button);
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("system");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("resolves the system preference to dark when the OS is dark", () => {
    mockSystemTheme(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    renderWithIntl(<ThemeToggle />);
    const button = screen.getByRole("button");
    fireEvent.click(button); // light → dark
    fireEvent.click(button); // dark → system
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });
});
