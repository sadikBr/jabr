import { Hammer } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Container,
  EmptyState,
  PageHeader,
} from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("projects");
  return { title: t("title"), description: t("lead") };
}

export default async function ProjectsPage() {
  const t = await getTranslations("projects");
  return (
    <Container>
      <PageHeader title={t("title")} lead={t("lead")} />
      <EmptyState
        icon={<Hammer aria-hidden="true" />}
        title={t("emptyTitle")}
        body={t("emptyBody")}
      />
    </Container>
  );
}
