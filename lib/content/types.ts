import type { MdxRefs } from "./mdx-refs";
import type { ContentStatus, Level, Subject } from "./vocabulary";

/** Plain content shapes. Velite's output (see velite.config.ts) conforms to these. */

export interface Concept {
  id: string;
  title: string;
  subject: Subject;
  summary: string;
  prerequisites: string[];
  lesson?: string;
}

export interface CourseModule {
  id: string;
  title: string;
  summary: string;
  lessons: string[];
  project?: string;
}

export interface Course {
  id: string;
  title: string;
  subject: Subject;
  level: Level;
  summary: string;
  status: ContentStatus;
  modules: CourseModule[];
  capstone?: string;
}

export interface Lesson {
  id: string;
  /** course/module/lesson — the stable key stored against user progress. */
  key: string;
  course: string;
  module: string;
  title: string;
  summary: string;
  teaches: string[];
  requires: string[];
  estimatedMinutes?: number;
  status: ContentStatus;
  /** Compiled MDX (function body). */
  body: string;
  refs: MdxRefs;
}

export interface Explainer {
  id: string;
  title: string;
  summary: string;
  subject: Subject;
  concepts: string[];
  related: string[];
  status: ContentStatus;
  body: string;
  refs: MdxRefs;
}

export interface Project {
  id: string;
  title: string;
  summary: string;
  subjects: Subject[];
  kind: "capstone" | "mini";
  concepts: string[];
  status: ContentStatus;
}

export type Tolerance = { absolute: number } | { relative: number };
export type ParamSpec =
  { min: number; max: number; step: number } | { choices: number[] };

interface QuestionBase {
  id: string;
  concepts: string[];
  prompt: string;
  hints: string[];
  solution?: string;
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: "multiple-choice";
  multiple: boolean;
  choices: { id: string; text: string; correct: boolean; feedback?: string }[];
}
export interface NumericQuestion extends QuestionBase {
  type: "numeric";
  answer: number;
  tolerance: Tolerance;
  unit?: string;
}
export interface ExpressionQuestion extends QuestionBase {
  type: "expression";
  answer: string;
  variables: string[];
}
export interface ParametrisedQuestion extends QuestionBase {
  type: "parametrised";
  params: Record<string, ParamSpec>;
  answer: string;
  tolerance: Tolerance;
  unit?: string;
}
export interface CodeQuestion extends QuestionBase {
  type: "code";
  starter: string;
  tests: string;
}
export interface SelfCheckQuestion extends QuestionBase {
  type: "self-check";
  rubric: string[];
}

export type Question =
  | MultipleChoiceQuestion
  | NumericQuestion
  | ExpressionQuestion
  | ParametrisedQuestion
  | CodeQuestion
  | SelfCheckQuestion;

/** All content, as one value. Everything in lib/content takes this as input. */
export interface ContentBundle {
  concepts: Concept[];
  courses: Course[];
  lessons: Lesson[];
  explainers: Explainer[];
  projects: Project[];
  questions: Question[];
}
