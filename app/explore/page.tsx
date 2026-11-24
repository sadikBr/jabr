import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Container,
  EmptyState,
  PageHeader,
} from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("explore");
  return { title: t("title"), description: t("lead") };
}

export default async function ExplorePage() {
  const t = await getTranslations("explore");
  return (
    <Container>
      <PageHeader title={t("title")} lead={t("lead")} />
      <EmptyState
        icon={<Compass aria-hidden="true" />}
        title={t("emptyTitle")}
        body={t("emptyBody")}
      />
    </Container>
  );
}
