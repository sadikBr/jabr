import { MousePointerClick } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { InteractiveHost } from "@/components/interactives/registry";
import {
  interactiveSpecs,
  isInteractiveId,
} from "@/lib/content/interactive-specs";

/** Frames an interactive from the registry. Props are validated at build time. */
export async function Interactive({
  id,
  props = {},
}: {
  id: string;
  props?: unknown;
}) {
  const t = await getTranslations("blocks.interactive");
  if (!isInteractiveId(id)) return null;
  const parsed = interactiveSpecs[id].props.parse(props);

  return (
    <div
      className="overflow-hidden rounded-2xl border bg-card shadow-sm"
      data-interactive={id}
    >
      <p className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold tracking-wide text-tone uppercase sm:px-5">
        <MousePointerClick aria-hidden="true" className="size-4" />
        {t("label")}
      </p>
      <InteractiveHost id={id} props={parsed} />
    </div>
  );
}
