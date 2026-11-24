"use client";

import { BookOpen, Compass, Hammer, House, Sprout } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

import { isActivePath, navItems } from "@/lib/site";
import { cn } from "@/lib/utils";

const icons = {
  home: House,
  explore: Compass,
  courses: BookOpen,
  projects: Hammer,
  progress: Sprout,
} as const;

/** Inline links for the desktop header. */
export function DesktopNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  return (
    <nav aria-label={t("main")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {navItems.map(({ href, key }) => {
          const active = isActivePath(pathname, href);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Bottom tab bar for phones and the installed app on small screens. */
export function MobileTabBar() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = [{ href: "/", key: "home" } as const, ...navItems];
  return (
    <nav
      aria-label={t("main")}
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map(({ href, key }) => {
          const active = isActivePath(pathname, href);
          const Icon = icons[key];
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className="size-5"
                  strokeWidth={active ? 2.5 : 2}
                />
                {t(key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
