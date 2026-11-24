import { WifiOff } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { robots: { index: false } };

/** Shown by the service worker for pages that are not saved on this device. */
export default async function OfflinePage() {
  const t = await getTranslations("offline");
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        <WifiOff aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-semibold">{t("title")}</h1>
      <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
        {t("body")}
      </p>
      <Button asChild className="mt-8">
        {/* A plain link: a full reload is what we want here. */}
        <a href="">{t("retry")}</a>
      </Button>
    </Container>
  );
}
