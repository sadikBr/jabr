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

import type { ContentBundle } from "./types";

/** All learning content, built from /content by Velite. */
export const content = {
  concepts,
  courses,
  lessons,
  explainers,
  projects,
  milestones,
  questions,
} as unknown as ContentBundle;
