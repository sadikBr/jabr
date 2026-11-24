import type { Subject } from "@/lib/content/vocabulary";

/**
 * The few facts about the content that progress views need in the browser.
 * Built on the server (lib/progress/catalog.server.ts) and passed down, so
 * the content itself is never bundled for the client.
 */
export interface ProgressCatalog {
  /** Written lessons, in teaching order. */
  lessons: {
    key: string;
    title: string;
    href: string;
    steps: number;
    courseTitle: string;
    subject: Subject;
  }[];
  courses: {
    id: string;
    title: string;
    subject: Subject;
    lessonKeys: string[];
  }[];
  concepts: { id: string; title: string; subject: Subject }[];
  /** Interactive titles by id. */
  interactives: Record<string, string>;
}
