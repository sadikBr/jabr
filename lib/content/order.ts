import type { ContentBundle } from "./types";
import { subjects } from "./vocabulary";

const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);

/**
 * Puts built content in an order that does not depend on the build. The
 * build tool reads content files concurrently, so the order it writes them
 * in can change from one run to the next, and anything that takes "the
 * first course" or "the first concept" would change with it.
 *
 * Courses follow their `order`. Concepts are grouped by subject, keeping the
 * order they are written in within each file, which runs from foundations
 * upwards. Everything else is sorted by id; pages that want another order
 * (ready before coming soon, say) sort again.
 */
export function inOrder(content: ContentBundle): ContentBundle {
  return {
    ...content,
    courses: [...content.courses].sort(
      (a, b) => a.order - b.order || byId(a, b),
    ),
    // Array.prototype.sort is stable, so ties keep their written order.
    concepts: [...content.concepts].sort(
      (a, b) => subjects.indexOf(a.subject) - subjects.indexOf(b.subject),
    ),
    lessons: [...content.lessons].sort((a, b) => a.key.localeCompare(b.key)),
    explainers: [...content.explainers].sort(byId),
    projects: [...content.projects].sort(byId),
    milestones: [...content.milestones].sort((a, b) =>
      a.key.localeCompare(b.key),
    ),
    questions: [...content.questions].sort(byId),
  };
}
