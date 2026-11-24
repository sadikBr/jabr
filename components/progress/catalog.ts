import type { QuestionType, Subject } from "@/lib/content/vocabulary";

/**
 * The few facts about the content that progress views need in the browser.
 * Built on the server (lib/progress/catalog.server.ts) and passed down, so
 * the content itself is never bundled for the client. Nothing here reveals
 * an answer.
 */
export interface ProgressCatalog {
  /** Written lessons, in teaching order. */
  lessons: {
    key: string;
    title: string;
    href: string;
    steps: number;
    courseId: string;
    courseTitle: string;
    subject: Subject;
    teaches: string[];
    requires: string[];
  }[];
  courses: {
    id: string;
    title: string;
    subject: Subject;
    lessonKeys: string[];
    /** Every concept the course teaches, including in lessons not yet written. */
    conceptIds: string[];
  }[];
  concepts: {
    id: string;
    title: string;
    subject: Subject;
    prerequisites: string[];
  }[];
  /** Questions that practise each concept, for review sessions. */
  questionsByConcept: Record<string, { id: string; type: QuestionType }[]>;
  projects: { id: string; title: string; concepts: string[] }[];
  /** Interactive titles by id. */
  interactives: Record<string, string>;
}

/** Where a concept can be learned: a written lesson, or failing that its own page. */
export interface LearnLink {
  href: string;
  /** The lesson's title, when the link goes to a lesson. */
  lessonTitle?: string;
}
