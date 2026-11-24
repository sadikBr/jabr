import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { Container, PageHeader } from "@/components/layout/page-shell";
import { DashboardView } from "@/components/progress/dashboard-view";
import { buildProgressCatalog } from "@/lib/progress/catalog.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("progress");
  return { title: t("title"), description: t("lead") };
}

export default async function DashboardPage() {
  const t = await getTranslations("progress");
  return (
    <Container className="pb-8">
      <PageHeader title={t("title")} lead={t("lead")} />
      <DashboardView catalog={buildProgressCatalog()} />
    </Container>
  );
}
