import "server-only";

import { content } from "@/lib/content/source";

/** Concept titles by id, for labelling the concepts a question practises. */
export const conceptTitles: Readonly<Record<string, string>> =
  Object.fromEntries(
    content.concepts.map((concept) => [concept.id, concept.title]),
  );
