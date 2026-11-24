import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";

import { HydrationMarker } from "@/components/layout/hydration-marker";
import { MobileTabBar } from "@/components/layout/nav-links";
import { GoalRecorder } from "@/components/progress/goal-recorder";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorker } from "@/components/pwa/service-worker";
import { localeDirection } from "@/i18n/config";
import { appleStartupImages } from "@/lib/pwa";
import { site } from "@/lib/site";
import { themeInitScript } from "@/lib/theme";

import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
// Display face for headings.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: { default: t("title"), template: t("titleTemplate") },
    description: t("description"),
    applicationName: site.name,
    appleWebApp: {
      capable: true,
      title: site.name,
      statusBarStyle: "default",
      startupImage: appleStartupImages,
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: site.themeColor.light },
    { media: "(prefers-color-scheme: dark)", color: site.themeColor.dark },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const t = await getTranslations();

  return (
    <html
      lang={locale}
      dir={localeDirection(locale)}
      data-theme="light"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <a
            href="#main"
            className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
          >
            {t("nav.skipToContent")}
          </a>
          <SiteHeader />
          <main id="main" className="flex flex-1 flex-col">
            {children}
          </main>
          <footer className="mt-16 border-t py-8 pb-24 text-center text-sm text-muted-foreground md:pb-8">
            {site.name} · {t("footer.tagline")}
          </footer>
          <MobileTabBar />
          <GoalRecorder />
          <HydrationMarker />
          <ServiceWorker />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
