import {
  BookMarked,
  Info,
  Lightbulb,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

const kinds = {
  note: { icon: Info, tone: "engineering" },
  tip: { icon: Lightbulb, tone: "computing" },
  insight: { icon: Sparkles, tone: "physics" },
  definition: { icon: BookMarked, tone: "maths" },
  warning: { icon: TriangleAlert, tone: "biology" },
} as const;

export async function Callout({
  kind = "note",
  title,
  children,
}: {
  kind?: keyof typeof kinds;
  title?: string;
  children: ReactNode;
}) {
  const t = await getTranslations("blocks.callout");
  const { icon: Icon, tone } = kinds[kind] ?? kinds.note;
  return (
    <aside
      data-subject={tone}
      className="rounded-e-xl border-s-4 border-tone bg-tone-soft/60 px-5 py-4"
    >
      <p className="flex items-center gap-2 text-sm font-semibold text-tone">
        <Icon aria-hidden="true" className="size-4" />
        <span>
          {t(kind in kinds ? kind : "note")}
          {title ? <span className="text-foreground"> · {title}</span> : null}
        </span>
      </p>
      <div className="mt-2 space-y-3">{children}</div>
    </aside>
  );
}
