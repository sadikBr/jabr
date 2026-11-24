import { MousePointerClick } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { InteractiveHost } from "@/components/interactives/registry";
import {
  type InteractiveId,
  interactiveSpecs,
  isInteractiveId,
} from "@/lib/content/interactive-specs";
import { renderRichText } from "@/lib/content/rich-text";
import { odeProblems } from "@/lib/sim/euler";

/** Props an interactive needs that are best prepared on the server. */
function serverExtras(
  id: InteractiveId,
  props: Record<string, unknown>,
): Record<string, unknown> {
  if (id === "euler-stepper") {
    const problem = odeProblems[props.problem as keyof typeof odeProblems];
    return {
      equationHtml: renderRichText(
        `$${problem.equation} \\qquad ${problem.solution}$`,
      ),
    };
  }
  return {};
}

/** Frames an interactive from the registry. Props are validated at build time. */
export async function Interactive({
  id,
  props = {},
  title,
}: {
  id: string;
  props?: unknown;
  /** Replaces the default "Try it" label. */
  title?: string;
}) {
  const t = await getTranslations("blocks.interactive");
  if (!isInteractiveId(id)) return null;
  const parsed = interactiveSpecs[id].props.parse(props) as Record<
    string,
    unknown
  >;

  return (
    <div
      className="not-prose overflow-hidden rounded-2xl border bg-card shadow-sm"
      data-interactive={id}
    >
      <p className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold tracking-wide text-tone uppercase sm:px-5">
        <MousePointerClick aria-hidden="true" className="size-4" />
        {title ?? t("label")}
      </p>
      <InteractiveHost
        id={id}
        props={{ ...parsed, ...serverExtras(id, parsed) }}
      />
    </div>
  );
}
