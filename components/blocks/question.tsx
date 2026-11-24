import { CircleHelp } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RichText } from "@/components/content/rich-text";
import { paramValues } from "@/lib/content/parametrised";
import { content } from "@/lib/content/source";

/**
 * Phase 1: shows the question's prompt only. Answer inputs, hints, grading
 * and worked solutions arrive with the grading engine in Phase 2. Only the
 * prompt is rendered, so no answer data reaches the page.
 */
export async function Question({ id }: { id: string }) {
  const t = await getTranslations("blocks.question");
  const question = content.questions.find((q) => q.id === id);
  if (!question) return null;

  // Parametrised prompts get their first parameter values for now; Phase 2
  // seeds them per attempt.
  let prompt = question.prompt;
  if (question.type === "parametrised") {
    for (const [name, spec] of Object.entries(question.params)) {
      prompt = prompt.replaceAll(`{${name}}`, String(paramValues(spec)[0]));
    }
  }

  return (
    <div className="rounded-xl border bg-card p-5" data-question={id}>
      <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        <CircleHelp aria-hidden="true" className="size-4 text-tone" />
        {t("label")} · {t(`types.${question.type}`)}
      </p>
      <div className="mt-3 text-[1.0625rem] leading-relaxed font-medium">
        <RichText text={prompt} />
      </div>
      {question.type === "multiple-choice" ? (
        <ul className="mt-4 grid gap-2">
          {question.choices.map((choice) => (
            <li
              key={choice.id}
              className="rounded-lg border bg-background px-4 py-3"
            >
              <RichText text={choice.text} />
            </li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 border-t pt-3 text-sm text-muted-foreground">
        {t("soon")}
      </p>
    </div>
  );
}
