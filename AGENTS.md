<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Jabr

A learning-by-doing platform for maths, physics, engineering and software.
`PROJECT_BRIEF.md` is the source of truth for product decisions and the phase
plan. This file records how the repo works. Keep it current.

**Status:** Phases 0 (foundations), 1 (content pipeline and reading) and 2
(interactivity and grading) are done. Phase 3 (accounts and progress) is next.

## Commands

Bun is the package manager and script runner.

| Command                           | What it does                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `bun install`                     | Install dependencies and generate the Prisma client                                                                        |
| `bun run dev`                     | Dev server on http://localhost:3000                                                                                        |
| `bun run build` / `bun run start` | Production build / serve it                                                                                                |
| `bun run lint`                    | ESLint                                                                                                                     |
| `bun run format` / `format:check` | Prettier (sorts Tailwind classes)                                                                                          |
| `bun run typecheck`               | `next typegen` then `tsc --noEmit`                                                                                         |
| `bun run test`                    | Vitest unit and component tests                                                                                            |
| `bun run e2e`                     | Playwright against a production build (desktop and 375px phone)                                                            |
| `bun run check`                   | lint + format check + typecheck + unit tests                                                                               |
| `bun run db:up` / `db:down`       | Start / stop local Postgres (Docker)                                                                                       |
| `bun run db:migrate`              | Create and apply a migration in development                                                                                |
| `bun run db:deploy`               | Apply migrations (CI, production)                                                                                          |
| `bun run content:check`           | Build content and validate it (add `--strict` to fail on warnings)                                                         |
| `bun run content:build`           | Build content only, into `.velite/`                                                                                        |
| `bun run content:verify-code`     | Run every code lab with system Python: starters fail, reference solutions pass (needs `python3` with numpy and matplotlib) |
| `bun run icons`                   | Regenerate favicon, app icons and iOS launch images                                                                        |

First-time setup: `cp .env.example .env`, `bun install`, `bun run db:up`,
`bun run db:deploy`, `bun run dev`. Nothing reads the database yet, so the app
also runs without Postgres.

For e2e, Playwright needs its Chromium (`bunx playwright install chromium`), or
set `PLAYWRIGHT_CHROMIUM_PATH` to an existing Chromium binary.

There is no seed step: learning content lives in git under `/content`, and
the database holds user state only.

## Content

Content is YAML and MDX under `/content`, built by Velite into `.velite/`
(git-ignored), so it must be built before anything imports it. Every script
does that first: `dev` builds once and then rebuilds on change; `build`,
`test`, `typecheck`, `lint` and `content:check` build with `--strict`, which
fails on any schema error. Without `--strict` Velite only prints the error
and drops the bad entry, so never remove the flag from those scripts.

- `velite.config.ts` holds the **shape** of each file (one schema per kind).
- `lib/content/validate.ts` holds every rule that spans files: references,
  the prerequisite graph, lesson rhythm, question checks. It is pure and
  unit-tested; `scripts/validate-content.ts` runs it on the real content.
- `lib/content/source.ts` is the only place that loads built content, and it
  is `server-only`. **Never import content into a client component**:
  questions carry their answers. Pass client components just the fields they
  render. An e2e test checks that answers do not reach the browser.
- `lib/content/queries.ts` has the pure lookups pages use.
- `content/ids.lock.json` records every id. Removing or renaming an id makes
  `content:check` warn, because saved progress refers to ids. If the removal
  is intended, run `bun run content:check --update-ids` and commit the file.

Writing content:

- A lesson is `content/courses/<course>/<module>/<lesson>.mdx`, listed in that
  course's `course.yaml`. Its body is `<Step kind title>` blocks in the order
  see → do → check → connect.
- An explainer is `content/explainers/<id>.mdx` with `<Layer depth>` blocks in
  the order intuition → mechanism → maths → build.
- Planned but unwritten lessons and explainers have `status: coming-soon` and
  no body.
- Components available in MDX are listed in `mdxComponentNames`
  (`lib/content/vocabulary.ts`) and mapped in
  `components/content/mdx-content.tsx`. Add to both.
- A new interactive needs a prop schema in `lib/content/interactive-specs.ts`
  and a component in `components/interactives/registry.tsx`. Sliders must be
  native range inputs (keyboard and touch for free) with the `slider` class,
  and the graphic needs a text description.
- Every formula, number and code sample must be checked before it is
  committed. Run code samples and paste their real output.
- **Reading alone is never the whole lesson.** Every lesson and explainer
  needs something to manipulate: an interactive, a question or a code lab.
  The validator warns (`nothing-to-do`) when one has none. When writing
  content, reach for an interactive first and prose second; open an
  explainer with something to try before the explanation.

## Questions and grading

- Questions live in `content/questions/**/*.yaml` and are placed with
  `<Question id>` (or `<CodeLab id>` for code questions). Types:
  multiple-choice, numeric, expression, parametrised, code, self-check.
- `lib/grading/` is pure and unit-tested. `grade(question, response,
{ seed })` returns `{ correct, score, feedback?, invalid? }`. An `invalid`
  response (unreadable input) is not an attempt.
- Learner input is untrusted. `lib/grading/expression.ts` parses it with
  mathjs but evaluates nothing until the tree passes a whitelist (numbers,
  declared variables, pi and e, + − × ÷ ^, a fixed list of functions).
  Expression answers are compared at seeded random points.
- Numeric and parametrised questions can list `commonMistakes` (a wrong
  answer plus the feedback for it). The grader also spots sign errors,
  power-of-ten slips and degrees read as radians on its own.
- Parametrised questions pick their numbers from a seed
  (`lib/grading/params.ts`). The page is prerendered with the question's
  default seed; "New numbers" asks the server for another and remembers it in
  `localStorage`.
- The browser only ever gets a `QuestionView` (`lib/questions/view.ts`):
  prompt, hints, choices, unit. Grading, solutions and choice feedback come
  from the Server Functions in `lib/questions/actions.ts`, which validate
  every input with Zod. A solution is returned only with a correct answer or
  an explicit "show the solution" request.
- `lib/questions/actions.test.ts` checks that the right answer to every real
  question is accepted, for several seeds. It runs with the unit tests.

## Code labs

- Python runs in the browser with Pyodide, in a module Web Worker
  (`public/python-worker.mjs`). That file is plain JavaScript served as-is:
  this Pyodide version refuses classic workers, and the bundler does not
  emit a module worker. `lib/codelab/runner.ts` is its only caller.
- The runtime is copied from `node_modules/pyodide` to
  `public/pyodide/v<version>/` on `postinstall` (git-ignored). numpy,
  matplotlib and other packages download from `cdn.jsdelivr.net` on first use.
- `lib/codelab/harness.ts` is the Python that runs a program and its tests.
  The worker and `scripts/verify-code.ts` both use it, so the browser and CI
  agree on what passes.
- A code question with `tests` is graded: `def test_…():` functions with
  assertion messages written for the learner. Without `tests` it is a
  playground. Graded labs need a reference solution at
  `tests/fixtures/solutions/<question-id>.py`, which never ships to the
  browser.
- Python cannot be interrupted from outside, so Stop and the 30-second
  timeout terminate the worker; the next run starts a new one.

## Offline

- `public/sw.js` is hand-written and small. Pages are network-first with a
  saved copy as fallback; build assets, the Python runtime and its packages
  are cache-first. Server Functions are never cached, so checking an answer
  offline shows "reconnect to check your answer".
- `components/pwa/service-worker.tsx` registers it in production only and
  tells it what to save: the page opened, the pages it links to, and the
  files already loaded.
- Bump `VERSION` in `public/sw.js` to discard every cache.

## Layout

```
app/            routes (App Router); manifest.ts, icon.svg, apple-icon.png
components/ui/  shadcn-style primitives
components/     layout/ (header, nav, page shell), brand/, theme/
i18n/           next-intl config (English only for now)
messages/       UI strings, one JSON file per locale
content/        learning content (YAML + MDX) and ids.lock.json
components/blocks/        MDX blocks: Step, Layer, Callout, Question…
components/content/       cards, chips, cover art, MDX renderer
components/interactives/  simulations + registry.ts
lib/            pure logic and helpers; lib/db is the Prisma client
lib/content/    vocabulary, validator, graph, queries
prisma/         schema and migrations
scripts/        generate-icons.ts
tests/e2e/      Playwright specs
tests/unit/     Vitest setup and helpers; unit tests sit next to their source
```

## Conventions

- **Read the Next.js docs in `node_modules/next/dist/docs/` before using an
  API.** This is Next.js 16 with `cacheComponents` on: pages are prerendered,
  and anything request-specific must sit behind `<Suspense>`.
- TypeScript is strict, with `noUncheckedIndexedAccess`.
- No hard-coded UI strings: add them to `messages/en.json` and use
  `getTranslations` (server) or `useTranslations` (client).
- Use logical properties (`ms-`, `pe-`, `start-`, `text-start`) so RTL works.
  Flip directional icons with `rtl:rotate-180`.
- Colours come from the tokens in `app/globals.css` (`bg-card`,
  `text-muted-foreground`…). Dark mode is `data-theme="dark"` on `<html>`, set
  before paint by the inline script in `lib/theme.ts`; the `dark:` variant
  follows it.
- Mobile first. Every page must work at 375px and must not scroll sideways (an
  e2e test checks this). Phones get the bottom tab bar, `md` and up the header
  nav. Respect safe-area insets on fixed bars.
- Business logic lives in `lib/` as pure, unit-tested functions, not in
  components.
- New pages get at least a smoke e2e test; new logic gets unit tests.
- Add `not-prose` to any card or widget rendered inside a `prose` container,
  or the article styles (bullets, link colours, widths) leak into it.
- Headings use the display font automatically (`h1`, `h2`); use
  `font-(family-name:--font-display)` elsewhere if needed.
- Simulations share their controls (`components/interactives/parts.tsx`):
  `Slider`, `Toggle`, `Segmented`, `Readout`, `GoalBanner`, `usePlayback`
  (honours reduced motion) and `useGoal` (fires a bubbling `jabr:goal` event
  once). Physics lives in `lib/sim/` as pure, tested functions.
- Server-only modules import `server-only`. Get the database with `getDb()`
  from `lib/db/client.ts`.
- Subject and step colours: put `data-subject="maths"` or `data-step="do"` on
  an element and use `bg-tone`, `text-tone`, `bg-tone-soft` inside it.
- Long-form text goes in a `prose` container (our own rules in
  `globals.css`, not the Tailwind typography plugin).
- `katex` must stay on the same version `rehype-katex` uses, or maths renders
  with broken spacing. A unit test guards this.
- Brand assets are generated: change `lib/brand.ts` or the colours in
  `lib/site.ts`, then run `bun run icons`. Do not edit the PNGs by hand.
- Conventional Commits (`feat:`, `fix:`, `content:`, `chore:`…).
- Work on a branch; merge to `main` at the end of each phase once checks pass.

## Decisions

| Date       | Decision                                                                                       | Why                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-24 | Bun instead of pnpm                                                                            | The repo was scaffolded with Bun                                                                                                      |
| 2026-11-24 | Docs live in `AGENTS.md`; `CLAUDE.md` points here                                              | Next.js generates and re-adds the block at the top of `AGENTS.md`                                                                     |
| 2026-11-24 | Installable web app (PWA) is a core requirement                                                | Must work as a desktop app and on phones without native apps                                                                          |
| 2026-11-24 | No service worker until Phase 2 (done)                                                         | Install needs only the manifest; offline caching arrives with the content and Pyodide it must cache                                   |
| 2026-11-24 | Prisma 7 (pinned), `prisma-client` generator, `pg` driver adapter                              | `bun add prisma` resolved to a Prisma 8 release candidate with a different CLI; 7 is the stable line                                  |
| 2026-11-24 | Generated Prisma client is git-ignored, built on `postinstall`                                 | Keeps generated code out of review                                                                                                    |
| 2026-11-24 | Status columns are Postgres enums, not free strings                                            | The database rejects invalid states                                                                                                   |
| 2026-11-24 | Own theme switcher (system / light / dark) instead of `next-themes`                            | Follows the Next 16 flash-prevention guide; about 60 lines, no dependency                                                             |
| 2026-11-24 | UI primitives are written in shadcn style on the `radix-ui` package                            | Same conventions as the shadcn CLI; `components.json` is set up so the CLI can add more                                               |
| 2026-11-24 | e2e runs against the production build                                                          | It is what ships, and prerendering and the manifest only behave as deployed there                                                     |
| 2026-11-24 | Auth providers enable themselves from env vars; demo sign-in behind flag                       | Easy local and preview testing without OAuth apps (Phase 3)                                                                           |
| 2026-11-24 | Planned: Velite, CodeMirror 6, random-point expression checking                                | See `PROJECT_BRIEF.md` section 6                                                                                                      |
| 2026-11-24 | Velite checks file shapes; our own pure validator checks everything else                       | Cross-file rules need the whole bundle and must be unit-testable on fixtures                                                          |
| 2026-11-24 | `<Step>` declares a `kind`; lessons are paged one step at a time                               | Lets the validator enforce the lesson rhythm and gives each step its own identity                                                     |
| 2026-11-24 | Explainer layers reveal cumulatively; the depth is kept in the URL hash                        | The reader decides where to stop, and a link can point at a depth                                                                     |
| 2026-11-24 | `tangent-zoom` built in Phase 1 instead of Phase 2                                             | The sample lesson needed a real interactive to be judged                                                                              |
| 2026-11-24 | Interactives take a named function from a fixed list, not a formula string                     | Keeps mathjs (large) off the client and gives exact derivatives                                                                       |
| 2026-11-24 | Content builds use `velite build --strict`; unwritten files carry a one-line MDX comment       | Plain builds silently drop invalid entries, and strict mode rejects an empty MDX body                                                 |
| 2026-11-24 | Pyodide runtime self-hosted from the npm package; packages from jsDelivr                       | Python starts without a third party and the version is pinned by `package.json`; the 20 MB of scientific packages stay off our deploy |
| 2026-11-24 | Python worker is a static module file in `public/`                                             | Pyodide 314 only runs in module workers, which the bundler would not produce                                                          |
| 2026-11-24 | Hand-written service worker instead of Serwist                                                 | Three caching rules; easier to reason about than a framework plugin on a new Next.js                                                  |
| 2026-11-24 | Offline also saves the pages a visited page links to                                           | The next lesson should be there when the connection is not                                                                            |
| 2026-11-24 | Question text is rendered to HTML on the server (KaTeX)                                        | Keeps KaTeX out of the browser bundle; the content is ours and is escaped                                                             |
| 2026-11-24 | Solutions are a separate server call                                                           | So Phase 3 can record "gave up" and mastery can treat it differently from solving                                                     |
| 2026-11-24 | Display font (Bricolage Grotesque) for headings; landing page opens with a playable simulation | Owner asked for a more distinctive, fun and hands-on feel                                                                             |

## Known limitations

- Nothing is saved to an account yet (Phase 3). Answers are graded but not
  recorded; code and chosen question numbers are kept in `localStorage` only.
- Code lab test results are computed in the browser and reported to the
  server, so a determined learner could fake a pass. Accepted for the MVP.
- numpy and matplotlib need a connection the first time they are used; after
  that the service worker serves them offline. Plain Python needs no download
  beyond the app itself.
- The first Python run takes a few seconds (about 14 MB of runtime).
- Ctrl/⌘+Enter runs code on desktop only; phones use the Run button.
- Only one lesson and one explainer are written; the rest are listed as
  coming soon. `content:check` warns about eight concepts no lesson teaches
  yet (the mechanics course and two foundations concepts).
- `euler-stepper` and `projectile-sim` are used on the landing page and in
  the explainer, not yet in a lesson of their own (Phase 6 content).
- Projects are listed but cannot be started until Phase 5.
- An unknown lesson, explainer or concept URL shows the not-found page with a
  `noindex` tag but HTTP status 200. That is how Next.js streams `notFound()`
  for dynamic routes with Cache Components on.
- No in-app install button yet (Phase 8); install from the browser's own menu.
- The database schema exists and migrates, but no page uses it until Phase 3.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
