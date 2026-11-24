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

import { TangentFigure } from "@/components/brand/tangent-figure";
import { Container } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";

const paths = [
  { key: "explore", href: "/explore", icon: Compass },
  { key: "courses", href: "/courses", icon: BookOpen },
  { key: "projects", href: "/projects", icon: Hammer },
] as const;

const pillars = [
  { key: "doing", icon: SlidersHorizontal },
  { key: "graph", icon: Network },
  { key: "projects", icon: Wrench },
] as const;

export default async function HomePage() {
  const t = await getTranslations("home");

  return (
    <>
      <Container className="grid items-center gap-10 py-12 sm:py-20 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-6 max-w-[60ch] text-lg leading-relaxed text-muted-foreground">
            {t("lead")}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/explore">
                {t("primaryCta")}
                <ArrowRight aria-hidden="true" className="rtl:rotate-180" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/courses">{t("secondaryCta")}</Link>
            </Button>
          </div>
        </div>
        <figure className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
          <TangentFigure label={t("figureAlt")} />
          <figcaption className="mt-2 text-center text-sm text-muted-foreground">
            {t("figureCaption")}
          </figcaption>
        </figure>
      </Container>

      <Container className="py-8">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("pathsTitle")}
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {paths.map(({ key, href, icon: Icon }) => (
            <li key={key}>
              <Link
                href={href}
                className="group flex h-full flex-col rounded-xl border bg-card p-6 transition-colors hover:border-primary/50"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <span className="mt-4 flex items-center gap-1 text-lg font-semibold">
                  {t(`paths.${key}.title`)}
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
                  />
                </span>
                <span className="mt-2 leading-relaxed text-muted-foreground">
                  {t(`paths.${key}.body`)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="py-12">
        <h2 className="text-2xl font-semibold tracking-tight">
          {t("pillarsTitle")}
        </h2>
        <ul className="mt-6 grid gap-8 md:grid-cols-3">
          {pillars.map(({ key, icon: Icon }) => (
            <li key={key}>
              <Icon aria-hidden="true" className="size-6 text-primary" />
              <h3 className="mt-3 font-semibold">
                {t(`pillars.${key}.title`)}
              </h3>
              <p className="mt-2 leading-relaxed text-muted-foreground">
                {t(`pillars.${key}.body`)}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
