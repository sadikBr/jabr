import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ExplainerGrid } from "@/components/content/explainer-grid";
import { Container, PageHeader } from "@/components/layout/page-shell";
import { content } from "@/lib/content/source";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore");
  return { title: t("title"), description: t("lead") };
}

export default async function ExplorePage() {
  const t = await getTranslations("explore");
  // Ready explainers first; otherwise keep the content order.
  const explainers = [...content.explainers]
    .sort((a, b) => Number(b.status === "ready") - Number(a.status === "ready"))
    .map(({ id, title, summary, subject, status, refs }) => ({
      id,
      title,
      summary,
      subject,
      status,
      layers: refs.layers.length,
    }));

  return (
    <Container>
      <PageHeader title={t("title")} lead={t("lead")} />
      <ExplainerGrid explainers={explainers} />
    </Container>
  );
}
