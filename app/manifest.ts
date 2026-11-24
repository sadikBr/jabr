import type { MetadataRoute } from "next";
import { getTranslations } from "next-intl/server";

import { navItems, site } from "@/lib/site";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const t = await getTranslations();
  return {
    id: "/",
    name: t("meta.title"),
    short_name: site.name,
    description: t("meta.description"),
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: site.themeColor.light,
    theme_color: site.brandColor,
    categories: ["education", "science"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: navItems.map(({ href, key }) => ({
      name: t(`nav.${key}`),
      url: href,
    })),
  };
}
