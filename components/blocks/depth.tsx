"use client";

import {
  ArrowDown,
  ChevronsDown,
  Cog,
  Hammer,
  Lightbulb,
  Sigma,
  Trophy,
} from "lucide-react";
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

  // Open straight at a layer when the URL names one (e.g. …#maths), on load
  // and whenever a link on the page points at one.
  useEffect(() => {
    function openFromHash() {
      const index = layers.indexOf(window.location.hash.slice(1) as Depth);
      if (index < 0) return;
      scrollTo.current = index;
      setReached((previous) => Math.max(previous, index));
    }
    if (window.location.hash.length > 1) openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
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
        className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 border-b bg-background/90 px-4 py-2.5 backdrop-blur sm:-mx-6 sm:px-6"
      >
        <div className="flex items-center gap-3">
          <p className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase max-md:sr-only">
            <ChevronsDown aria-hidden="true" className="size-4" />
            {t("depthShort")}
          </p>
          {/* A gauge: every layer reached so far is filled in. */}
          <ol className="flex min-w-0 flex-1 gap-1">
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
                      "flex h-10 w-full cursor-pointer items-center justify-center gap-2 px-2 text-sm font-semibold transition-colors",
                      index === 0 && "rounded-s-full",
                      index === layers.length - 1 && "rounded-e-full",
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
        </div>
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
  const NextIcon = next ? depthIcons[next] : null;

  return (
    <section
      id={depth}
      hidden={!visible}
      data-subject={depthTones[depth]}
      aria-labelledby={`${depth}-title`}
      className={cn(
        "scroll-mt-32 pt-8 pb-4",
        visible && index > 0 && "animate-rise-in",
      )}
    >
      {/* The layer's banner: which depth this is, and what to expect. */}
      <header className="flex items-center gap-4 rounded-2xl bg-tone-soft p-4 sm:p-5">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-tone text-background sm:size-14">
          <Icon aria-hidden="true" className="size-6 sm:size-7" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-tone uppercase">
            {t("layerOf", { current: index + 1, total: layers.length })}
          </p>
          <h2
            id={`${depth}-title`}
            data-layer-heading
            tabIndex={-1}
            className="text-2xl leading-tight font-semibold outline-none sm:text-3xl"
          >
            {t(`depths.${depth}.name`)}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t(`depths.${depth}.hint`)}
          </p>
        </div>
      </header>

      <div className="prose mt-7">{children}</div>

      {isDeepestShown && next && NextIcon ? (
        <button
          type="button"
          onClick={() => context.reveal(index + 1)}
          data-subject={depthTones[next]}
          className="group mt-10 flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 border-dashed border-tone/50 p-4 text-start transition-colors hover:border-tone hover:bg-tone-soft sm:p-5"
        >
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-tone-soft text-tone transition-colors group-hover:bg-tone group-hover:text-background">
            <NextIcon aria-hidden="true" className="size-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold tracking-wide text-tone uppercase">
              {t("goDeeper")}
            </span>
            <span className="block text-lg leading-tight font-semibold">
              {t(`depths.${next}.name`)}
            </span>
            <span className="block text-sm text-muted-foreground">
              {t(`depths.${next}.hint`)}
            </span>
          </span>
          <ArrowDown
            aria-hidden="true"
            className="size-6 shrink-0 text-tone transition-transform group-hover:translate-y-1"
          />
        </button>
      ) : null}
      {isDeepestShown && !next && layers.length > 1 ? (
        <p className="mt-10 flex items-center gap-3 rounded-2xl bg-accent/15 p-4 font-semibold sm:p-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <Trophy aria-hidden="true" className="size-5" />
          </span>
          {t("reachedEnd")}
        </p>
      ) : null}
    </section>
  );
}
