export const site = {
  name: "Jabr",
  /** Brand colours used outside CSS (manifest, viewport, generated icons). */
  themeColor: { light: "#fbfaf8", dark: "#14162b" },
  brandColor: "#4338ca",
} as const;

export const navItems = [
  { href: "/explore", key: "explore" },
  { href: "/courses", key: "courses" },
  { href: "/projects", key: "projects" },
  { href: "/dashboard", key: "progress" },
] as const;

export type NavKey = (typeof navItems)[number]["key"];

/** True when `pathname` is `href` or a page nested under it. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
