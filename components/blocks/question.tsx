import { CodeLab } from "@/components/codelab/code-lab";
import { QuestionCard } from "@/components/questions/question-card";
import { content } from "@/lib/content/source";
import { conceptTitles } from "@/lib/questions/concept-titles";
import { buildQuestionView } from "@/lib/questions/view";

/**
 * Renders a question from /content by id. Only the public view crosses to
 * the browser; answers stay on the server (see lib/questions/view.ts).
 */
export function Question({ id }: { id: string }) {
  const question = content.questions.find((q) => q.id === id);
  if (!question) return null;
  const view = buildQuestionView(question, undefined, conceptTitles);
  return view.type === "code" ? (
    <CodeLab view={view} />
  ) : (
    <QuestionCard initial={view} />
  );
}

/** `<CodeLab id>` in MDX: the same thing, named for what the learner sees. */
export { Question as CodeLab };
