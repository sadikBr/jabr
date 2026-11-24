import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MapView } from "@/components/graph/map-view";
import { Container } from "@/components/layout/page-shell";
import { layoutConceptGraph } from "@/lib/content/graph-layout";
import { content } from "@/lib/content/source";
import { buildProgressCatalog } from "@/lib/progress/catalog.server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("map");
  return { title: t("title"), description: t("lead") };
}

export default async function MapPage() {
  const t = await getTranslations("map");
  const { concepts, courses } = buildProgressCatalog();
  return (
    <Container className="pb-8">
      {/* A compact header: the map itself should get the screen. */}
      <div className="py-6">
        <h1 className="text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-2 max-w-[70ch] text-muted-foreground">{t("lead")}</p>
      </div>
      <MapView
        layout={layoutConceptGraph(content.concepts)}
        catalog={{ concepts, courses }}
      />
    </Container>
  );
}
