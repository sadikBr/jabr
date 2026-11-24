import { findPrerequisiteCycle } from "./graph";
import { checkInteractiveProps, isInteractiveId } from "./interactive-specs";
import type { MdxRefs } from "./mdx-refs";
import { evaluateAnswer, paramCombinations } from "./parametrised";
import type { ContentBundle, Lesson, Question } from "./types";
import { depths, mdxComponentNames, stepKinds } from "./vocabulary";

export type IssueCode =
  | "duplicate-id"
  | "missing-concept"
  | "missing-lesson"
  | "missing-question"
  | "missing-interactive"
  | "invalid-interactive-props"
  | "missing-explainer"
  | "missing-project"
  | "unknown-component"
  | "prerequisite-cycle"
  | "lesson-not-in-course"
  | "canonical-lesson-mismatch"
  | "invalid-steps"
  | "invalid-layers"
  | "requires-taught-later"
  | "question-without-concepts"
  | "question-missing-hints"
  | "question-invalid-choices"
  | "parametrised-answer-error"
  | "question-unused"
  | "concept-never-taught"
  | "removed-id";

export interface Issue {
  level: "error" | "warning";
  code: IssueCode;
  /** Where the problem is, e.g. `lesson calculus/derivatives/intro`. */
  source: string;
  message: string;
}

/** Ids recorded in content/ids.lock.json, by kind. */
export type IdLock = Record<
  "concepts" | "courses" | "lessons" | "explainers" | "projects" | "questions",
  string[]
>;

export function collectIds(content: ContentBundle): IdLock {
  const sorted = (ids: string[]) => [...new Set(ids)].sort();
  return {
    concepts: sorted(content.concepts.map((c) => c.id)),
    courses: sorted(content.courses.map((c) => c.id)),
    lessons: sorted(content.lessons.map((l) => l.key)),
    explainers: sorted(content.explainers.map((e) => e.id)),
    projects: sorted(content.projects.map((p) => p.id)),
    questions: sorted(content.questions.map((q) => q.id)),
  };
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const id of ids) (seen.has(id) ? repeated : seen).add(id);
  return [...repeated];
}

/** Questions where a learner could reasonably get stuck need at least one hint. */
function needsHints(question: Question): boolean {
  return question.type !== "multiple-choice" && question.type !== "self-check";
}

function isInOrder<T>(values: T[], order: readonly T[]): boolean {
  return values.every(
    (value, i) =>
      i === 0 || order.indexOf(values[i - 1] as T) <= order.indexOf(value),
  );
}

/**
 * Checks everything that spans more than one content file. Pure: pass the
 * whole bundle in, get every issue back. `lock` is the previously recorded
 * id list, used to warn when an id disappears (user progress refers to ids).
 */
export function validateContent(
  content: ContentBundle,
  lock?: IdLock,
): Issue[] {
  const issues: Issue[] = [];
  const error = (code: IssueCode, source: string, message: string) =>
    issues.push({ level: "error", code, source, message });
  const warning = (code: IssueCode, source: string, message: string) =>
    issues.push({ level: "warning", code, source, message });

  const conceptIds = new Set(content.concepts.map((c) => c.id));
  const lessonsByKey = new Map(content.lessons.map((l) => [l.key, l]));
  const explainerIds = new Set(content.explainers.map((e) => e.id));
  const projectIds = new Set(content.projects.map((p) => p.id));
  const questionIds = new Set(content.questions.map((q) => q.id));

  // --- Duplicate ids -------------------------------------------------------
  const idGroups: [string, string[]][] = [
    ["concept", content.concepts.map((c) => c.id)],
    ["course", content.courses.map((c) => c.id)],
    ["lesson", content.lessons.map((l) => l.key)],
    ["explainer", content.explainers.map((e) => e.id)],
    ["project", content.projects.map((p) => p.id)],
    ["question", content.questions.map((q) => q.id)],
  ];
  for (const [kind, ids] of idGroups) {
    for (const id of duplicates(ids)) {
      error(
        "duplicate-id",
        `${kind} ${id}`,
        `More than one ${kind} has the id "${id}".`,
      );
    }
  }

  const requireConcepts = (ids: string[], source: string, role: string) => {
    for (const id of ids) {
      if (!conceptIds.has(id)) {
        error(
          "missing-concept",
          source,
          `${role} refers to the concept "${id}", which does not exist.`,
        );
      }
    }
  };

  /** Checks the components and references inside one MDX document. */
  const checkRefs = (refs: MdxRefs, source: string) => {
    for (const name of refs.components) {
      if (!(mdxComponentNames as readonly string[]).includes(name)) {
        error(
          "unknown-component",
          source,
          `Uses <${name}>, which is not a known content component.`,
        );
      }
    }
    for (const { id, props } of refs.interactives) {
      if (!id || !isInteractiveId(id)) {
        error(
          "missing-interactive",
          source,
          `<Interactive id="${id ?? ""}"> is not in the interactive registry.`,
        );
        continue;
      }
      const problem =
        props === null
          ? "props must be a literal object"
          : checkInteractiveProps(id, props);
      if (problem) {
        error(
          "invalid-interactive-props",
          source,
          `<Interactive id="${id}"> has invalid props: ${problem}.`,
        );
      }
    }
    for (const id of refs.questions) {
      if (!questionIds.has(id)) {
        error(
          "missing-question",
          source,
          `<Question id="${id}"> does not exist.`,
        );
      }
    }
    for (const connection of refs.connections) {
      requireConcepts(connection.concepts, source, "<ConnectIt>");
      for (const id of connection.explainers) {
        if (!explainerIds.has(id)) {
          error(
            "missing-explainer",
            source,
            `<ConnectIt> refers to the explainer "${id}", which does not exist.`,
          );
        }
      }
      for (const id of connection.projects) {
        if (!projectIds.has(id)) {
          error(
            "missing-project",
            source,
            `<ConnectIt> refers to the project "${id}", which does not exist.`,
          );
        }
      }
    }
  };

  // --- Concepts ------------------------------------------------------------
  for (const concept of content.concepts) {
    const source = `concept ${concept.id}`;
    requireConcepts(concept.prerequisites, source, "prerequisites");
    if (concept.lesson) {
      const lesson = lessonsByKey.get(concept.lesson);
      if (!lesson) {
        error(
          "missing-lesson",
          source,
          `Canonical lesson "${concept.lesson}" does not exist.`,
        );
      } else if (!lesson.teaches.includes(concept.id)) {
        error(
          "canonical-lesson-mismatch",
          source,
          `Canonical lesson "${concept.lesson}" does not list this concept in "teaches".`,
        );
      }
    }
  }
  const cycle = findPrerequisiteCycle(content.concepts);
  if (cycle) {
    error(
      "prerequisite-cycle",
      `concept ${cycle[0]}`,
      `Prerequisites form a cycle: ${cycle.join(" → ")}.`,
    );
  }

  // --- Courses and their lessons -------------------------------------------
  const listedLessonKeys = new Set<string>();
  for (const course of content.courses) {
    const source = `course ${course.id}`;
    if (course.capstone && !projectIds.has(course.capstone)) {
      error(
        "missing-project",
        source,
        `Capstone project "${course.capstone}" does not exist.`,
      );
    }
    for (const id of duplicates(course.modules.map((m) => m.id))) {
      error("duplicate-id", source, `More than one module has the id "${id}".`);
    }

    const ordered: Lesson[] = [];
    for (const courseModule of course.modules) {
      if (courseModule.project && !projectIds.has(courseModule.project)) {
        error(
          "missing-project",
          source,
          `Module "${courseModule.id}" refers to the project "${courseModule.project}", which does not exist.`,
        );
      }
      for (const lessonId of courseModule.lessons) {
        const key = `${course.id}/${courseModule.id}/${lessonId}`;
        listedLessonKeys.add(key);
        const lesson = lessonsByKey.get(key);
        if (lesson) ordered.push(lesson);
        else
          error(
            "missing-lesson",
            source,
            `Module "${courseModule.id}" lists the lesson "${lessonId}", but ${key}.mdx does not exist.`,
          );
      }
    }

    // A lesson should not rely on something the course only teaches later.
    ordered.forEach((lesson, index) => {
      for (const conceptId of lesson.requires) {
        const taughtLater = ordered
          .slice(index + 1)
          .find((later) => later.teaches.includes(conceptId));
        const taughtBefore = ordered
          .slice(0, index)
          .some((earlier) => earlier.teaches.includes(conceptId));
        if (taughtLater && !taughtBefore) {
          warning(
            "requires-taught-later",
            `lesson ${lesson.key}`,
            `Requires "${conceptId}", which this course only teaches later, in "${taughtLater.id}".`,
          );
        }
      }
    });
  }

  for (const lesson of content.lessons) {
    const source = `lesson ${lesson.key}`;
    if (!listedLessonKeys.has(lesson.key)) {
      error(
        "lesson-not-in-course",
        source,
        "This lesson file is not listed in its course.yaml.",
      );
    }
    requireConcepts(lesson.teaches, source, '"teaches"');
    requireConcepts(lesson.requires, source, '"requires"');
    checkRefs(lesson.refs, source);
    if (lesson.status !== "ready") continue;

    const kinds = lesson.refs.steps.map((step) => step.kind);
    const validKinds = kinds.every((kind) =>
      (stepKinds as readonly (string | null)[]).includes(kind),
    );
    const hasAllKinds = stepKinds.every((kind) => kinds.includes(kind));
    if (
      !validKinds ||
      !hasAllKinds ||
      !isInOrder(kinds, stepKinds as readonly (string | null)[])
    ) {
      error(
        "invalid-steps",
        source,
        `Steps must follow the rhythm ${stepKinds.join(" → ")}, each <Step> with a valid "kind". Found: ${kinds.join(", ") || "none"}.`,
      );
    }
    const titles = lesson.refs.steps.map((step) => step.title ?? "");
    if (titles.some((title) => !title) || duplicates(titles).length > 0) {
      error(
        "invalid-steps",
        source,
        "Every <Step> needs a title, and titles must be unique within the lesson.",
      );
    }
  }

  // --- Explainers ----------------------------------------------------------
  for (const explainer of content.explainers) {
    const source = `explainer ${explainer.id}`;
    requireConcepts(explainer.concepts, source, '"concepts"');
    for (const id of explainer.related) {
      if (!explainerIds.has(id)) {
        error(
          "missing-explainer",
          source,
          `"related" refers to the explainer "${id}", which does not exist.`,
        );
      }
    }
    checkRefs(explainer.refs, source);
    if (explainer.status !== "ready") continue;

    const { layers } = explainer.refs;
    const valid =
      layers.length > 0 &&
      layers.every((layer) => (depths as readonly string[]).includes(layer)) &&
      duplicates(layers).length === 0 &&
      layers[0] === depths[0] &&
      isInOrder(layers, depths as readonly string[]);
    if (!valid) {
      error(
        "invalid-layers",
        source,
        `Layers must start with "${depths[0]}" and follow the order ${depths.join(" → ")} without repeats. Found: ${layers.join(", ") || "none"}.`,
      );
    }
  }

  // --- Projects ------------------------------------------------------------
  for (const project of content.projects) {
    requireConcepts(project.concepts, `project ${project.id}`, '"concepts"');
  }

  // --- Questions -----------------------------------------------------------
  const usedQuestionIds = new Set(
    content.lessons.flatMap((lesson) => lesson.refs.questions),
  );
  for (const question of content.questions) {
    const source = `question ${question.id}`;
    if (question.concepts.length === 0) {
      error(
        "question-without-concepts",
        source,
        "A question must be tagged with at least one concept.",
      );
    }
    requireConcepts(question.concepts, source, '"concepts"');
    if (needsHints(question) && question.hints.length === 0) {
      error(
        "question-missing-hints",
        source,
        `A ${question.type} question needs at least one hint.`,
      );
    }
    if (!usedQuestionIds.has(question.id)) {
      warning("question-unused", source, "No lesson uses this question.");
    }

    if (question.type === "multiple-choice") {
      const correct = question.choices.filter((choice) => choice.correct);
      if (duplicates(question.choices.map((choice) => choice.id)).length > 0) {
        error("question-invalid-choices", source, "Choice ids must be unique.");
      }
      if (correct.length === 0) {
        error(
          "question-invalid-choices",
          source,
          "No choice is marked correct.",
        );
      } else if (!question.multiple && correct.length > 1) {
        error(
          "question-invalid-choices",
          source,
          'Several choices are marked correct; set "multiple: true" or keep one.',
        );
      }
    }

    if (question.type === "parametrised") {
      const failures: string[] = [];
      for (const values of paramCombinations(question.params)) {
        try {
          evaluateAnswer(question.answer, values);
        } catch (cause) {
          failures.push(
            `${JSON.stringify(values)}: ${cause instanceof Error ? cause.message : String(cause)}`,
          );
        }
      }
      if (failures.length > 0) {
        error(
          "parametrised-answer-error",
          source,
          `The answer formula fails for ${failures.length} parameter combination(s), e.g. ${failures[0]}.`,
        );
      }
    }
  }

  // --- Coverage ------------------------------------------------------------
  const taught = new Set(content.lessons.flatMap((lesson) => lesson.teaches));
  for (const concept of content.concepts) {
    if (!taught.has(concept.id)) {
      warning(
        "concept-never-taught",
        `concept ${concept.id}`,
        "No lesson teaches this concept.",
      );
    }
  }

  // --- Removed ids ---------------------------------------------------------
  if (lock) {
    const current = collectIds(content);
    for (const kind of Object.keys(current) as (keyof IdLock)[]) {
      const present = new Set(current[kind]);
      for (const id of lock[kind] ?? []) {
        if (!present.has(id)) {
          warning(
            "removed-id",
            `${kind} ${id}`,
            "This id existed before and is now gone. Saved progress may refer to it; renaming needs a migration. If the removal is intended, run `bun run content:check --update-ids`.",
          );
        }
      }
    }
  }

  return issues;
}
