"use client";

import { ArrowDown, Cog, Hammer, Lightbulb, Sigma, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import type { Depth } from "@/lib/content/vocabulary";
import { cn } from "@/lib/utils";

const depthIcons = {
  intuition: Lightbulb,
  mechanism: Cog,
  maths: Sigma,
  build: Hammer,
} as const;

// Each depth borrows a subject tone so the layers read as distinct bands.
const depthTones = {
  intuition: "physics",
  mechanism: "engineering",
  maths: "maths",
  build: "computing",
} as const;

interface DepthContextValue {
  layers: Depth[];
  /** Index of the deepest layer currently shown. */
  reached: number;
  reveal: (index: number) => void;
}

const DepthContext = createContext<DepthContextValue | null>(null);

/**
 * Lets the reader choose how deep to go. Layers up to the chosen depth are
 * shown one after another; the gauge jumps straight to any layer.
 */
export function DepthProvider({
  layers,
  children,
}: {
  layers: Depth[];
  children: ReactNode;
}) {
  const t = useTranslations("explainer");
  const [reached, setReached] = useState(0);
  const scrollTo = useRef<number | null>(null);

  const reveal = useCallback(
    (index: number) => {
      scrollTo.current = index;
      setReached((previous) => Math.max(previous, index));
      history.replaceState(null, "", `#${layers[index]}`);
    },
    [layers],
  );

  // Open straight at a layer when the URL names one (e.g. …#maths).
  useEffect(() => {
    const index = layers.indexOf(window.location.hash.slice(1) as Depth);
    if (index > 0) {
      scrollTo.current = index;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the hash only exists in the browser
      setReached(index);
    }
  }, [layers]);

  useEffect(() => {
    if (scrollTo.current === null) return;
    const target = document.getElementById(layers[scrollTo.current]!);
    scrollTo.current = null;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    target
      ?.querySelector<HTMLElement>("[data-layer-heading]")
      ?.focus({ preventScroll: true });
  });

  return (
    <DepthContext.Provider value={{ layers, reached, reveal }}>
      <nav
        aria-label={t("depthLabel")}
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("depthLabel")}
        </p>
        <ol className="flex gap-1.5 sm:gap-2">
          {layers.map((layer, index) => {
            const Icon = depthIcons[layer];
            const shown = index <= reached;
            return (
              <li
                key={layer}
                data-subject={depthTones[layer]}
                className="min-w-0 flex-1"
              >
                <button
                  type="button"
                  onClick={() => reveal(index)}
                  aria-pressed={shown}
                  title={t(`depths.${layer}.hint`)}
                  className={cn(
                    "flex h-10 w-full items-center justify-center gap-2 rounded-full px-2 text-sm font-semibold transition-colors",
                    shown
                      ? "bg-tone text-background"
                      : "bg-muted text-muted-foreground hover:bg-tone-soft hover:text-tone",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="truncate max-sm:sr-only">
                    {t(`depths.${layer}.name`)}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
      {children}
    </DepthContext.Provider>
  );
}

/** One depth layer of an explainer. Hidden until the reader goes that deep. */
export function Layer({
  depth,
  children,
}: {
  depth: Depth;
  children: ReactNode;
}) {
  const t = useTranslations("explainer");
  const context = useContext(DepthContext);
  const layers = context?.layers ?? [depth];
  const index = layers.indexOf(depth);
  const visible = !context || index <= context.reached;
  const isDeepestShown = !!context && index === context.reached;
  const next = layers[index + 1];
  const Icon = depthIcons[depth] ?? Lightbulb;

  return (
    <section
      id={depth}
      hidden={!visible}
      data-subject={depthTones[depth]}
      aria-labelledby={`${depth}-title`}
      className={cn(
        "scroll-mt-40 border-t py-10 first:border-t-0",
        visible && index > 0 && "animate-rise-in",
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-tone">
        <span className="flex size-7 items-center justify-center rounded-full bg-tone-soft">
          <Icon aria-hidden="true" className="size-4" />
        </span>
        {t("layerOf", { current: index + 1, total: layers.length })}
      </p>
      <h2
        id={`${depth}-title`}
        data-layer-heading
        tabIndex={-1}
        className="mt-3 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
      >
        {t(`depths.${depth}.name`)}
      </h2>
      <div className="prose mt-6">{children}</div>

      {isDeepestShown && next ? (
        <div
          data-subject={depthTones[next]}
          className="mt-10 flex flex-col items-start gap-3 rounded-xl bg-tone-soft p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="text-sm font-semibold text-tone">
              {t("goDeeperTo", { name: t(`depths.${next}.name`) })}
            </p>
            <p className="text-sm text-muted-foreground">
              {t(`depths.${next}.hint`)}
            </p>
          </div>
          <Button
            onClick={() => context.reveal(index + 1)}
            className="bg-tone text-background hover:bg-tone/90"
          >
            {t("goDeeper")}
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      {isDeepestShown && !next && layers.length > 1 ? (
        <p className="mt-10 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Trophy aria-hidden="true" className="size-5 text-accent" />
          {t("reachedEnd")}
        </p>
      ) : null}
    </section>
  );
}
