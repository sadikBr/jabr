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
  /** Where the course comes in the catalog: 1 is first. */
  order: number;
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
  /** Milestone ids, in order. */
  milestones: string[];
  status: ContentStatus;
}

export interface Milestone {
  id: string;
  /** project/milestone — the stable key stored against user progress. */
  key: string;
  project: string;
  title: string;
  summary: string;
  requires: string[];
  /** Id of the code question that checks the milestone. */
  check: string;
  estimatedMinutes?: number;
  /** Compiled MDX (function body): the instructions. */
  body: string;
  refs: MdxRefs;
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
/** A known wrong answer and what to tell a learner who gives it. */
export interface CommonMistake<Answer> {
  answer: Answer;
  feedback: string;
}

export interface NumericQuestion extends QuestionBase {
  type: "numeric";
  answer: number;
  tolerance: Tolerance;
  unit?: string;
  commonMistakes: CommonMistake<number>[];
}
export interface ExpressionQuestion extends QuestionBase {
  type: "expression";
  answer: string;
  variables: string[];
}
export interface ParametrisedQuestion extends QuestionBase {
  type: "parametrised";
  params: Record<string, ParamSpec>;
  /** Formulas for further values shown in the prompt, in order. */
  derived: Record<string, string>;
  answer: string;
  tolerance: Tolerance;
  unit?: string;
  /** Wrong answers as formulas of the params, like `answer`. */
  commonMistakes: CommonMistake<string>[];
}
export interface CodeQuestion extends QuestionBase {
  type: "code";
  starter: string;
  /** Python `test_*` functions. Without tests the lab is a free playground. */
  tests?: string;
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
  milestones: Milestone[];
  questions: Question[];
}
