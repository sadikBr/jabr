import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { DesktopNav } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]">
        <Link href="/" className="rounded-lg">
          <Logo />
        </Link>
        <DesktopNav />
        <div className="ms-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
