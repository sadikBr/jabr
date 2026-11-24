import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import { defineCollection, defineConfig, s } from "velite";

import { extractMdxRefs } from "./lib/content/mdx-refs";
import { contentStatuses, levels, subjects } from "./lib/content/vocabulary";

// Shapes only. Cross-references, the prerequisite graph and everything else
// that needs more than one file are checked by lib/content/validate.ts.

const id = s
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "ids are kebab-case (a-z, 0-9, hyphens)");
const questionId = s
  .string()
  .regex(
    /^[a-z0-9]+([.-][a-z0-9]+)*$/,
    "question ids are dotted kebab-case, e.g. calc.deriv.slope-1",
  );
const status = s.enum(contentStatuses).default("ready");
const refs = s
  .custom()
  .transform((_, { meta }) => extractMdxRefs(meta.content ?? ""));

const concepts = defineCollection({
  name: "Concept",
  pattern: "concepts/*.yaml",
  schema: s.object({
    id,
    title: s.string(),
    subject: s.enum(subjects),
    summary: s.string(),
    prerequisites: s.array(id).default([]),
    /** Canonical lesson, as course/module/lesson. */
    lesson: s.string().optional(),
  }),
});

const courses = defineCollection({
  name: "Course",
  pattern: "courses/*/course.yaml",
  schema: s.object({
    id,
    title: s.string(),
    subject: s.enum(subjects),
    level: s.enum(levels),
    summary: s.string(),
    status,
    modules: s
      .array(
        s.object({
          id,
          title: s.string(),
          summary: s.string(),
          lessons: s.array(id).min(1),
          project: id.optional(),
        }),
      )
      .min(1),
    capstone: id.optional(),
  }),
});

const lessons = defineCollection({
  name: "Lesson",
  pattern: "courses/*/*/*.mdx",
  schema: s
    .object({
      id,
      title: s.string(),
      summary: s.string(),
      teaches: s.array(id).min(1),
      requires: s.array(id).default([]),
      estimatedMinutes: s.number().int().positive().optional(),
      status,
      path: s.path(),
      body: s.mdx(),
      refs,
    })
    .transform((lesson, { addIssue }) => {
      // path is "courses/<course>/<module>/<lesson>"
      const [, course = "", module = "", file = ""] = lesson.path.split("/");
      if (file !== lesson.id) {
        addIssue({
          code: "custom",
          message: `lesson id "${lesson.id}" must match its file name "${file}"`,
        });
      }
      return { ...lesson, course, module, key: `${course}/${module}/${file}` };
    }),
});

const explainers = defineCollection({
  name: "Explainer",
  pattern: "explainers/*.mdx",
  schema: s
    .object({
      id,
      /** The question the explainer answers. */
      title: s.string(),
      summary: s.string(),
      subject: s.enum(subjects),
      concepts: s.array(id).default([]),
      /** "You might also wonder…" */
      related: s.array(id).default([]),
      status,
      path: s.path(),
      body: s.mdx(),
      refs,
    })
    .transform((explainer, { addIssue }) => {
      const file = explainer.path.split("/").at(-1);
      if (file !== explainer.id) {
        addIssue({
          code: "custom",
          message: `explainer id "${explainer.id}" must match its file name "${file}"`,
        });
      }
      return explainer;
    }),
});

const projects = defineCollection({
  name: "Project",
  pattern: "projects/*/project.yaml",
  schema: s.object({
    id,
    title: s.string(),
    summary: s.string(),
    subjects: s.array(s.enum(subjects)).min(1),
    kind: s.enum(["capstone", "mini"]),
    concepts: s.array(id).default([]),
    status,
  }),
});

const questionBase = {
  id: questionId,
  concepts: s.array(id).default([]),
  /** Markdown with inline maths. `{name}` is replaced by a parameter value. */
  prompt: s.string(),
  hints: s.array(s.string()).default([]),
  /** Full worked solution, shown after the attempt. */
  solution: s.string().optional(),
};

const tolerance = s.union([
  s.object({ absolute: s.number().nonnegative() }).strict(),
  s.object({ relative: s.number().nonnegative() }).strict(),
]);

const param = s.union([
  s
    .object({ min: s.number(), max: s.number(), step: s.number().positive() })
    .strict(),
  s.object({ choices: s.array(s.number()).min(1) }).strict(),
]);

const questions = defineCollection({
  name: "Question",
  pattern: "questions/**/*.yaml",
  schema: s.discriminatedUnion("type", [
    s.object({
      ...questionBase,
      type: s.literal("multiple-choice"),
      /** True when more than one choice may be selected. */
      multiple: s.boolean().default(false),
      choices: s
        .array(
          s.object({
            id: s.string(),
            text: s.string(),
            correct: s.boolean().default(false),
            feedback: s.string().optional(),
          }),
        )
        .min(2),
    }),
    s.object({
      ...questionBase,
      type: s.literal("numeric"),
      answer: s.number(),
      tolerance,
      unit: s.string().optional(),
      commonMistakes: s
        .array(s.object({ answer: s.number(), feedback: s.string() }))
        .default([]),
    }),
    s.object({
      ...questionBase,
      type: s.literal("expression"),
      answer: s.string(),
      variables: s.array(s.string()).min(1),
    }),
    s.object({
      ...questionBase,
      type: s.literal("parametrised"),
      params: s.record(param),
      /** A mathjs formula of the params. */
      answer: s.string(),
      tolerance,
      unit: s.string().optional(),
      /** Known wrong answers, as formulas of the params, with targeted feedback. */
      commonMistakes: s
        .array(s.object({ answer: s.string(), feedback: s.string() }))
        .default([]),
    }),
    s.object({
      ...questionBase,
      type: s.literal("code"),
      starter: s.string(),
      /** Python `test_*` functions run in the Pyodide worker. Omit for a free playground. */
      tests: s.string().optional(),
    }),
    s.object({
      ...questionBase,
      type: s.literal("self-check"),
      rubric: s.array(s.string()).min(1),
    }),
  ]),
});

export default defineConfig({
  root: "content",
  output: {
    data: ".velite",
    assets: "public/content",
    base: "/content/",
    name: "[name]-[hash:8].[ext]",
    clean: true,
  },
  strict: true,
  collections: { concepts, courses, lessons, explainers, projects, questions },
  mdx: {
    remarkPlugins: [remarkMath],
    rehypePlugins: [
      rehypeSlug,
      [rehypeKatex, { strict: "error", throwOnError: true }],
      [
        rehypePrettyCode,
        {
          theme: { light: "github-light", dark: "github-dark-dimmed" },
          keepBackground: false,
          defaultLang: "plaintext",
          // Inline `code` keeps its simple pill style; only fenced blocks
          // are highlighted.
          bypassInlineCode: true,
        },
      ],
    ],
  },
});
