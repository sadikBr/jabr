import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import {
  Container,
  EmptyState,
  PageHeader,
} from "@/components/layout/page-shell";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("courses");
  return { title: t("title"), description: t("lead") };
}

export default async function CoursesPage() {
  const t = await getTranslations("courses");
  return (
    <Container>
      <PageHeader title={t("title")} lead={t("lead")} />
      <EmptyState
        icon={<BookOpen aria-hidden="true" />}
        title={t("emptyTitle")}
        body={t("emptyBody")}
      />
    </Container>
  );
}
