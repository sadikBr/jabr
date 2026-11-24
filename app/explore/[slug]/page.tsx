import { ArrowLeft, ArrowRight, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { DepthProvider } from "@/components/blocks/depth";
import { ConceptChips } from "@/components/content/concept-chip";
import { MdxContent } from "@/components/content/mdx-content";
import { SubjectBadge } from "@/components/content/subject";
import { Container } from "@/components/layout/page-shell";
import { getConcepts, getExplainer } from "@/lib/content/queries";
import { content } from "@/lib/content/source";
import type { Depth } from "@/lib/content/vocabulary";

type Props = PageProps<"/explore/[slug]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.explainers.map((explainer) => ({ slug: explainer.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const explainer = getExplainer(content, (await params).slug);
  return explainer
    ? { title: explainer.title, description: explainer.summary }
    : {};
}

export default async function ExplainerPage({ params }: Props) {
  const explainer = getExplainer(content, (await params).slug);
  if (!explainer) notFound();
  const t = await getTranslations();
  const concepts = getConcepts(content, explainer.concepts);
  const related = explainer.related
    .map((id) => getExplainer(content, id))
    .filter((item) => item !== undefined);
  const ready = explainer.status === "ready";

  return (
    <Container className="max-w-4xl">
      <div data-subject={explainer.subject} className="pt-6 pb-8">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("explainer.back")}
        </Link>
        <div className="mt-4">
          <SubjectBadge
            subject={explainer.subject}
            label={t(`subjects.${explainer.subject}`)}
          />
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {explainer.title}
        </h1>
        <p className="mt-4 max-w-[70ch] text-lg leading-relaxed text-muted-foreground">
          {explainer.summary}
        </p>
      </div>

      {ready ? (
        <DepthProvider layers={explainer.refs.layers as Depth[]}>
          <MdxContent code={explainer.body} />
        </DepthProvider>
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed bg-card px-6 py-14 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <PenLine aria-hidden="true" className="size-6" />
          </span>
          <h2 className="mt-4 text-lg font-semibold">
            {t("explainer.comingSoonTitle")}
          </h2>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            {t("explainer.comingSoonBody")}
          </p>
        </div>
      )}

      <section className="mt-12 border-t pt-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("explainer.concepts")}
        </h2>
        <ConceptChips concepts={concepts} className="mt-3" />
      </section>

      {related.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("explainer.related")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.id} data-subject={item.subject}>
                <Link
                  href={`/explore/${item.id}`}
                  className="group flex h-full items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-tone"
                >
                  <span className="flex-1 leading-snug font-semibold">
                    {item.title}
                    {item.status === "coming-soon" ? (
                      <span className="ms-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted-foreground">
                        {t("common.soon")}
                      </span>
                    ) : null}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
