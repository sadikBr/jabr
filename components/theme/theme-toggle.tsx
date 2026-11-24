"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  nextThemePreference,
  parseThemePreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme";

const CHANGE_EVENT = "jabr-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function applyTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference, matchMedia(DARK_QUERY).matches);
  document.documentElement.setAttribute("data-theme", resolved);
}

function subscribe(onChange: () => void): () => void {
  const media = matchMedia(DARK_QUERY);
  const handle = () => {
    applyTheme(readPreference());
    onChange();
  };
  // Catch a system theme change that happened between the inline head script
  // and hydration, before this listener existed.
  applyTheme(readPreference());
  window.addEventListener(CHANGE_EVENT, handle);
  window.addEventListener("storage", handle);
  media.addEventListener("change", handle);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handle);
    window.removeEventListener("storage", handle);
    media.removeEventListener("change", handle);
  };
}

const icons = { system: Monitor, light: Sun, dark: Moon } as const;

export function ThemeToggle() {
  const t = useTranslations("theme");
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => "system",
  );
  const Icon = icons[preference];

  function cycle() {
    const next = nextThemePreference(preference);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the theme still applies for this page.
    }
    applyTheme(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={t("label", { preference: t(preference) })}
      title={t(preference)}
      data-theme-preference={preference}
    >
      <Icon />
    </Button>
  );
}
