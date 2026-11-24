import { ChevronDown, PencilLine } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

/** A solution the learner opens when ready. Native <details>: works without JS. */
export async function WorkedExample({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const t = await getTranslations("blocks");
  return (
    <details className="group rounded-xl border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
          <PencilLine aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("workedExample")}
          </span>
          <span className="block font-semibold">{title}</span>
        </span>
        <span className="hidden text-sm font-medium text-primary group-open:hidden sm:inline">
          {t("showSolution")}
        </span>
        <span className="hidden text-sm font-medium text-primary sm:group-open:inline">
          {t("hideSolution")}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t px-5 py-5">{children}</div>
    </details>
  );
}
