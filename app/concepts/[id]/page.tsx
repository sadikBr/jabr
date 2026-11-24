import { ArrowRight, BookOpen, Compass, Hammer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ComponentType, ReactNode } from "react";

import { ConceptChips } from "@/components/content/concept-chip";
import { SubjectBadge } from "@/components/content/subject";
import { Container } from "@/components/layout/page-shell";
import {
  conceptUsage,
  getConcept,
  getConcepts,
  lessonHref,
} from "@/lib/content/queries";
import { content } from "@/lib/content/source";

type Props = PageProps<"/concepts/[id]">;

// Every valid URL is prerendered from generateStaticParams, so the page reads
// its params directly rather than streaming behind a placeholder.
export const instant = false;

export function generateStaticParams() {
  return content.concepts.map((concept) => ({ id: concept.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const concept = getConcept(content, (await params).id);
  return concept ? { title: concept.title, description: concept.summary } : {};
}

export default async function ConceptPage({ params }: Props) {
  const concept = getConcept(content, (await params).id);
  if (!concept) notFound();
  const t = await getTranslations();
  const usage = conceptUsage(content, concept.id);
  const prerequisites = getConcepts(content, concept.prerequisites);
  // The canonical lesson first, then any others that teach it.
  const taughtIn = [...usage.taughtIn].sort(
    (a, b) =>
      Number(b.key === concept.lesson) - Number(a.key === concept.lesson),
  );
  const usedIn = [
    ...usage.usedInLessons.map((lesson) => ({
      key: lesson.key,
      href: lessonHref(lesson),
      icon: BookOpen,
      label: t("common.lesson"),
      title: lesson.title,
      soon: lesson.status !== "ready",
    })),
    ...usage.explainers.map((explainer) => ({
      key: explainer.id,
      href: `/explore/${explainer.id}`,
      icon: Compass,
      label: t("common.explainer"),
      title: explainer.title,
      soon: explainer.status !== "ready",
    })),
    ...usage.projects.map((project) => ({
      key: project.id,
      href: "/projects",
      icon: Hammer,
      label: t("common.project"),
      title: project.title,
      soon: project.status !== "ready",
    })),
  ];

  return (
    <Container className="max-w-4xl py-8">
      <div data-subject={concept.subject}>
        <div className="flex items-center gap-2">
          <SubjectBadge
            subject={concept.subject}
            label={t(`subjects.${concept.subject}`)}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {t("common.concept")}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
          {concept.title}
        </h1>
        <p className="mt-5 max-w-[70ch] border-s-4 border-tone ps-4 text-xl leading-relaxed">
          {concept.summary}
        </p>
      </div>

      {/* The concept's place in the graph: what it needs, what it unlocks. */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Panel title={t("concept.prerequisites")}>
          {prerequisites.length > 0 ? (
            <ConceptChips concepts={prerequisites} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("concept.prerequisitesNone")}
            </p>
          )}
        </Panel>
        {usage.buildsToward.length > 0 ? (
          <Panel title={t("concept.buildsToward")}>
            <ConceptChips concepts={usage.buildsToward} />
          </Panel>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          {t("concept.learnIt")}
        </h2>
        {taughtIn.length > 0 ? (
          <LinkList
            items={taughtIn.map((lesson) => ({
              key: lesson.key,
              href: lessonHref(lesson),
              icon: BookOpen,
              label: t("common.lesson"),
              title: lesson.title,
              soon: lesson.status !== "ready",
            }))}
            soonLabel={t("common.soon")}
          />
        ) : (
          <p className="mt-3 text-muted-foreground">
            {t("concept.learnItNone")}
          </p>
        )}
      </section>

      {usedIn.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold tracking-tight">
            {t("concept.usedIn")}
          </h2>
          <LinkList items={usedIn} soonLabel={t("common.soon")} />
        </section>
      ) : null}
    </Container>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5">
      <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function LinkList({
  items,
  soonLabel,
}: {
  items: {
    key: string;
    href: string;
    icon: ComponentType<{ className?: string }>;
    label: string;
    title: string;
    soon: boolean;
  }[];
  soonLabel: string;
}) {
  return (
    <ul className="mt-4 grid gap-3 sm:grid-cols-2">
      {items.map(({ key, href, icon: Icon, label, title, soon }) => (
        <li key={`${label}-${key}`}>
          <Link
            href={href}
            className="group flex h-full items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/50"
          >
            <Icon
              aria-hidden="true"
              className="mt-0.5 size-5 shrink-0 text-primary"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                {label}
                {soon ? (
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {soonLabel}
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block leading-snug font-semibold">
                {title}
              </span>
            </span>
            <ArrowRight
              aria-hidden="true"
              className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
