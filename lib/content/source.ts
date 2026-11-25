import "server-only";

// Server-only: questions.json contains answers and must never reach the
// client bundle. Client components receive only the fields they render.
import concepts from "@/.velite/concepts.json";
import courses from "@/.velite/courses.json";
import explainers from "@/.velite/explainers.json";
import lessons from "@/.velite/lessons.json";
import milestones from "@/.velite/milestones.json";
import projects from "@/.velite/projects.json";
import questions from "@/.velite/questions.json";

import { inOrder } from "./order";
import type { ContentBundle } from "./types";

/**
 * All learning content, built from /content by Velite and put in a fixed
 * order: Velite writes its files in whatever order it happened to read them.
 */
export const content = inOrder({
  concepts,
  courses,
  lessons,
  explainers,
  projects,
  milestones,
  questions,
} as unknown as ContentBundle);
