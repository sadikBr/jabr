import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/page-shell";
import { ReviewSession } from "@/components/review/review-session";
import { buildProgressCatalog } from "@/lib/progress/catalog.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("review");
  return { title: t("title"), description: t("lead") };
}

export default async function ReviewPage() {
  const t = await getTranslations("review");
  const { concepts, questionsByConcept } = buildProgressCatalog();
  return (
    <Container className="max-w-3xl pb-8">
      <div className="py-6 sm:py-8">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("lead")}</p>
      </div>
      <ReviewSession catalog={{ concepts, questionsByConcept }} />
    </Container>
  );
}
