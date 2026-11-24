import { Atom, Cog, Dna, Sigma, Terminal } from "lucide-react";
import type { ComponentType } from "react";

import type { Subject } from "@/lib/content/vocabulary";
import { cn } from "@/lib/utils";

export const subjectIcons: Record<
  Subject,
  ComponentType<{ className?: string }>
> = {
  maths: Sigma,
  physics: Atom,
  computing: Terminal,
  engineering: Cog,
  biology: Dna,
};

/** Small coloured label for a subject. `label` is the translated name. */
export function SubjectBadge({
  subject,
  label,
  className,
}: {
  subject: Subject;
  label: string;
  className?: string;
}) {
  const Icon = subjectIcons[subject];
  return (
    <span
      data-subject={subject}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-tone-soft px-2.5 py-1 text-xs font-semibold text-tone",
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      {label}
    </span>
  );
}
