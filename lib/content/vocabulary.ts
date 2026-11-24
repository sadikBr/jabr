/** Fixed vocabularies shared by the content schemas, the validator and the UI. */

export const subjects = [
  "maths",
  "physics",
  "computing",
  "engineering",
  "biology",
] as const;
export type Subject = (typeof subjects)[number];

export const levels = ["foundations", "university-year-1"] as const;
export type Level = (typeof levels)[number];

/** A lesson's rhythm: See it → Do it → Check it → Connect it. */
export const stepKinds = ["see", "do", "check", "connect"] as const;
export type StepKind = (typeof stepKinds)[number];

/** Explainer depth layers, shallowest first. */
export const depths = ["intuition", "mechanism", "maths", "build"] as const;
export type Depth = (typeof depths)[number];

export const contentStatuses = ["ready", "coming-soon"] as const;
export type ContentStatus = (typeof contentStatuses)[number];

/** Components a lesson or explainer may use. Anything else fails validation. */
export const mdxComponentNames = [
  "Step",
  "Layer",
  "Callout",
  "WorkedExample",
  "ConnectIt",
  "Interactive",
  "Question",
  "Figure",
] as const;

export const questionTypes = [
  "multiple-choice",
  "numeric",
  "expression",
  "parametrised",
  "code",
  "self-check",
] as const;
export type QuestionType = (typeof questionTypes)[number];
