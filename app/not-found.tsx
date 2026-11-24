import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <Container className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="font-mono text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {t("notFound.title")}
      </h1>
      <p className="mt-3 text-muted-foreground">{t("notFound.body")}</p>
      <Button asChild className="mt-8">
        <Link href="/">{t("common.backHome")}</Link>
      </Button>
    </Container>
  );
}
