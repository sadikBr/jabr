import {
  ArrowRight,
  BookOpen,
  Compass,
  Hammer,
  Network,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Interactive } from "@/components/blocks/interactive";
import { subjectIcons } from "@/components/content/subject";
import { Container } from "@/components/layout/page-shell";
import { ContinueCard } from "@/components/progress/continue-card";
import { Button } from "@/components/ui/button";
import { content } from "@/lib/content/source";
import { buildProgressCatalog } from "@/lib/progress/catalog.server";

const paths = [
  { key: "explore", href: "/explore", icon: Compass, tone: "physics" },
  { key: "courses", href: "/courses", icon: BookOpen, tone: "maths" },
  { key: "projects", href: "/projects", icon: Hammer, tone: "computing" },
] as const;

const pillars = [
  { key: "doing", icon: SlidersHorizontal },
  { key: "graph", icon: Network },
  { key: "projects", icon: Wrench },
] as const;

export default async function HomePage() {
  const t = await getTranslations();
  const catalog = buildProgressCatalog();
  // Written explainers first, then the ones still to come.
  const questions = [...content.explainers]
    .sort((a, b) => Number(b.status === "ready") - Number(a.status === "ready"))
    .slice(0, 3);

  return (
    <>
      <div className="bg-glow border-b">
        <Container className="grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-sm font-medium">
              <span
                aria-hidden="true"
                className="size-2 rounded-full bg-accent"
              />
              {t("home.eyebrow")}
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-semibold text-balance sm:text-5xl lg:text-6xl">
              {t.rich("home.title", {
                mark: (chunks) => (
                  <span className="relative whitespace-nowrap text-primary">
                    {chunks}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 200 12"
                      preserveAspectRatio="none"
                      className="absolute inset-x-0 -bottom-1.5 h-2.5 w-full text-accent"
                    >
                      <path
                        d="M2 8 Q50 1 100 6 T198 5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                ),
              })}
            </h1>
            <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-muted-foreground">
              {t("home.lead")}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/explore">
                  {t("home.primaryCta")}
                  <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/courses">{t("home.secondaryCta")}</Link>
              </Button>
            </div>
          </div>

          {/* Something to do within ten seconds of arriving. */}
          <div>
            <Interactive
              id="projectile-sim"
              title={t("home.tryTitle")}
              props={{ speed: 18, angle: 30, goal: { target: 62 } }}
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              {t("home.tryCaption")}
            </p>
          </div>
        </Container>
      </div>

      {/* Returning learners get their next lesson before anything else. */}
      <Container className="empty:hidden [&:not(:empty)]:pt-8">
        <ContinueCard lessons={catalog.lessons} onlyReturning />
      </Container>

      <Container className="py-12 sm:py-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {t("home.questionsTitle")}
          </h2>
          <Link
            href="/explore"
            className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {t("home.questionsAll")}
            <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {questions.map((explainer) => {
            const Icon = subjectIcons[explainer.subject];
            const ready = explainer.status === "ready";
            return (
              <li key={explainer.id} data-subject={explainer.subject}>
                <Link
                  href={`/explore/${explainer.id}`}
                  className="lift group flex h-full flex-col rounded-2xl border bg-card p-5 hover:border-tone"
                >
                  <span className="flex items-center justify-between">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-tone-soft text-tone">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    {ready ? null : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {t("common.comingSoon")}
                      </span>
                    )}
                  </span>
                  <span className="mt-4 block text-xl leading-snug font-semibold text-balance">
                    {explainer.title}
                  </span>
                  <span className="mt-2 block flex-1 leading-relaxed text-muted-foreground">
                    {explainer.summary}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>

      <div className="border-y bg-muted/50">
        <Container className="py-12 sm:py-16">
          <h2 className="text-2xl font-semibold sm:text-3xl">
            {t("home.pathsTitle")}
          </h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {paths.map(({ key, href, icon: Icon, tone }) => (
              <li key={key} data-subject={tone}>
                <Link
                  href={href}
                  className="lift group flex h-full flex-col rounded-2xl border bg-card p-6 hover:border-tone"
                >
                  <span className="flex size-12 items-center justify-center rounded-xl bg-tone text-background">
                    <Icon aria-hidden="true" className="size-6" />
                  </span>
                  <span className="mt-4 flex items-center gap-1 text-xl font-semibold">
                    {t(`home.paths.${key}.title`)}
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 rtl:rotate-180"
                    />
                  </span>
                  <span className="mt-2 leading-relaxed text-muted-foreground">
                    {t(`home.paths.${key}.body`)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </div>

      <Container className="py-12 sm:py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">
          {t("home.pillarsTitle")}
        </h2>
        <ul className="mt-6 grid gap-8 md:grid-cols-3">
          {pillars.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Icon aria-hidden="true" className="size-7 text-primary" />
              <h3 className="mt-3 text-lg font-semibold">
                {t(`home.pillars.${key}.title`)}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t(`home.pillars.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
