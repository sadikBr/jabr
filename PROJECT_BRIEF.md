# Project brief: Jabr, a learning-by-doing platform for science, engineering and software


You are going to build this application in this repository, from an empty folder to a deployable MVP. Read this whole brief before writing any code. It is the source of truth for product decisions; when something here is ambiguous, ask me before guessing on anything expensive to undo.

---

## 1. Your role and how to work

You are acting as a senior full-stack engineer and a learning-experience designer at the same time. You care about clean architecture *and* about whether a learner actually understands the material.

Working rules:

1. **Work in the phases in section 13, in order.** At the start of each phase: write a short plan (files to create, decisions, risks), then implement, then run lint, typecheck and tests, then give me a summary of what was built, how to try it, and what's next. Stop at the end of each phase and wait for my go-ahead.
2. **Create and maintain `CLAUDE.md`** at the repo root with: how to run, test, seed and build; folder conventions; coding conventions; and a short "decisions" list (date + decision + why). Update it whenever something changes.
3. **Ask before**: changing any part of the tech stack in section 6, adding a paid service, adding a dependency that duplicates one we already have, or deleting content.
4. **Commit in small, meaningful steps** with Conventional Commit messages (`feat:`, `fix:`, `content:`, `chore:`…).
5. **No fake completeness.** Don't leave `TODO: implement` inside a feature you report as done. If something is stubbed, say so in your summary and in `CLAUDE.md`.
6. **Content must be correct.** Every formula, definition, worked solution and code sample you write as learning content must be accurate. Double-check physics and maths; run every code sample.
7. Prefer boring, well-maintained libraries over clever custom code. Keep functions small and typed. Business logic (grading, mastery, scheduling, graph logic) lives in pure, unit-tested modules, not in React components.

---

## 2. Product vision

Jabr is a place where anyone can **understand how things work** and **learn subjects properly**: maths, physics, biology, engineering and software. It rests on three pillars:

1. **Learning by doing.** Every concept is taught with something to manipulate: a simulation with sliders, a live code cell, a step-by-step problem with feedback. Reading alone is never the whole lesson.
2. **A shared knowledge graph.** Every concept (e.g. *derivative*, *vector*, *Newton's second law*, *for loop*) exists once in a graph with prerequisites. Courses, explainers and projects all reference the same concepts, so mastery carries over across subjects and gaps are visible.
3. **Project-based learning.** Real projects that combine several subjects (e.g. *build a rocket flight simulator* = calculus + mechanics + Python), split into milestones that link back to the concepts they need.

## 3. Audiences and entry points

| Audience | What they want | Entry point |
|---|---|---|
| Curious learner | "How does X actually work?" with little friction | **Explore**: question-led explainers |
| University student | Structured courses that match their university subjects, exam-style practice | **Courses** |
| Builder | Make something real, learn what's needed along the way | **Projects** |

All three entry points share the same concept graph and the same interactive building blocks.

Explainers are layered by depth, and the learner chooses where to stop:
1. **Intuition**: short, visual, no maths required
2. **Mechanism**: how it works step by step, with interactives
3. **Maths & science**: the real equations, made approachable
4. **Build it**: a small hands-on task or link to a project

---

## 4. Domain glossary (use these names in code)

- **Concept**: an atomic idea in the graph. It has a stable `id` (kebab-case, e.g. `derivative-definition`), a title, a subject, a short summary, `prerequisites: ConceptId[]`, and optionally a mini-lesson.
- **Subject**: Maths, Physics, Biology, Engineering, Computing.
- **Course**: an ordered sequence of **Modules**; each Module is an ordered sequence of **Lessons**.
- **Lesson**: an MDX document made of **Blocks**. It declares `teaches: ConceptId[]` and `requires: ConceptId[]`.
- **Block**: a unit inside a lesson: prose, figure, `Interactive`, `Question`, `CodeLab`, `WorkedExample`, `Callout`, `ConnectIt` (links to where the concept is used).
- **Explainer**: a question-led article ("How does GPS work?") with up to 4 depth layers; also declares concepts.
- **Project**: a multi-milestone build. Each **Milestone** has instructions, starter code or setup, a check (automated tests or self-check rubric), and `requires: ConceptId[]`.
- **Question**: a gradable item defined in content, graded on the server.
- **Attempt**: one learner answer to one question.
- **Mastery**: a per-user, per-concept score from 0 to 1 with a status (`new`, `learning`, `practicing`, `mastered`).
- **Review card**: a spaced-repetition schedule entry per user and concept.

---

## 5. MVP scope

### In scope
- Content pipeline (MDX + YAML in git), validated at build time
- Explore, Courses and Projects sections, with reading and interactivity
- Interactive simulations, in-browser Python code labs, server-graded questions
- Accounts, progress, mastery, knowledge map, prerequisite hints, spaced review
- One complete capstone project
- Real seed content for the MVP "spine" (section 12)
- Responsive, accessible UI with dark mode
- Deployment setup

### Out of scope for MVP (design so they can be added later)
- Content authoring UI or CMS (content lives in git for now)
- Teacher classrooms, community and discussions, certificates, payments
- Native mobile apps
- Non-English content (but the code must be i18n-ready and RTL-ready, because French and Arabic come next)
- AI tutor (Phase 7, optional, behind a feature flag)

---

## 6. Tech stack

- **Framework:** Next.js (latest stable, App Router) + TypeScript in `strict` mode
- **Styling/UI:** Tailwind CSS + shadcn/ui (Radix primitives), lucide icons. Use CSS logical properties (`ms-`, `pe-`, etc.) so RTL works later.
- **Content:** MDX files + YAML in `/content`, compiled with a typed content layer (Velite or similar; pick one and record it in `CLAUDE.md`). Maths via `remark-math` + `rehype-katex`. Code highlighting via Shiki.
- **Database:** PostgreSQL + Prisma. Local Postgres via `docker-compose.yml`.
- **Auth:** Auth.js (NextAuth v5) with GitHub, Google and email magic-link providers. Guests can read and try everything; progress is saved after sign-in.
- **Maths checking:** `mathjs` for numeric evaluation, plus a symbolic equivalence check (CortexJS Compute Engine, or random-point numeric equivalence as a fallback). Put this behind a single `checkExpression()` interface.
- **Code labs:** Pyodide running in a Web Worker (with numpy and matplotlib), plus a Monaco or CodeMirror editor. Tests run in the worker; results come back as structured pass/fail.
- **Simulations:** React + `<canvas>` or SVG, with no heavy physics engine unless a sim really needs one.
- **Graph visualisation:** React Flow (`@xyflow/react`) with automatic layout (dagre or elkjs).
- **Spaced repetition:** `ts-fsrs`.
- **Validation:** Zod for content schemas, server actions and API inputs.
- **i18n scaffolding:** `next-intl`, English only for now, but no hard-coded UI strings.
- **Testing:** Vitest (unit), Playwright (e2e), Testing Library (components).
- **Quality:** ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI running all of them plus the content validator.
- **Deploy target:** Vercel + a managed Postgres (Neon or Supabase). Provide `.env.example`.

---

## 7. Architecture and repo layout

```
/
├─ app/                      # Next.js routes (App Router)
│  ├─ (marketing)/page.tsx   # landing
│  ├─ explore/               # explainers list + [slug]
│  ├─ courses/               # catalog, [course], [course]/[module]/[lesson]
│  ├─ projects/              # catalog, [project], [project]/[milestone]
│  ├─ map/                   # personal knowledge map
│  ├─ review/                # spaced review session
│  ├─ dashboard/             # learner home
│  ├─ concepts/[id]/         # concept page + mini-lesson
│  └─ api/                   # only where server actions don't fit
├─ components/
│  ├─ ui/                    # shadcn primitives
│  ├─ blocks/                # Question, CodeLab, WorkedExample, Callout, ConnectIt…
│  ├─ interactives/          # simulations + registry.ts
│  └─ graph/                 # knowledge map components
├─ lib/
│  ├─ content/               # loaders, schemas, graph building
│  ├─ grading/               # checkers per question type (pure, tested)
│  ├─ mastery/               # mastery update rules (pure, tested)
│  ├─ review/                # FSRS wrapper (pure, tested)
│  ├─ recommend/             # next-step + gap detection (pure, tested)
│  └─ db/                    # Prisma client + repositories
├─ workers/pyodide.worker.ts
├─ content/
│  ├─ concepts/*.yaml
│  ├─ courses/<course>/course.yaml
│  ├─ courses/<course>/<module>/<lesson>.mdx
│  ├─ explainers/*.mdx
│  ├─ projects/<project>/project.yaml + milestones/*.mdx
│  └─ questions/<scope>/*.yaml
├─ scripts/validate-content.ts
├─ prisma/schema.prisma
├─ tests/ (e2e)
├─ CLAUDE.md
└─ docker-compose.yml
```

**Key decision:** learning content (concepts, courses, lessons, questions, projects) lives in **git files**, not in the database. The database stores only **user state** (accounts, attempts, mastery, progress, review cards), which references content by stable ids. Content ids must never be reused or renamed silently; the validator should warn on removed ids.

---

## 8. Content system

### 8.1 Concepts (`content/concepts/<subject>.yaml`)
```yaml
- id: derivative-definition
  title: The derivative as a rate of change
  subject: maths
  summary: The instantaneous rate at which a quantity changes; the slope of the tangent line.
  prerequisites: [limits-intuition, slope-of-a-line]
  lesson: courses/calculus-essentials/derivatives/what-is-a-derivative   # optional canonical lesson
```

### 8.2 Course (`course.yaml`)
```yaml
id: calculus-essentials
title: Calculus essentials
subject: maths
level: university-year-1
summary: Limits, derivatives and integrals, built through interaction.
modules:
  - id: derivatives
    title: Derivatives
    lessons: [what-is-a-derivative, derivative-rules, derivatives-in-motion]
    project: tangent-line-explorer   # optional mini project id
capstone: rocket-flight-simulator
```

### 8.3 Lesson (MDX with frontmatter)
```mdx
---
id: what-is-a-derivative
title: What is a derivative?
teaches: [derivative-definition]
requires: [limits-intuition, slope-of-a-line]
estimatedMinutes: 12
---

<Step title="See it">
Imagine zooming into a curve until it looks straight…
<Interactive id="tangent-zoom" props={{ fn: "x^2", x0: 1 }} />
</Step>

<Step title="Do it">
<Question id="calc.deriv.slope-at-point" />
</Step>

<Step title="Check it">
<Question id="calc.deriv.concept-check-1" />
</Step>

<ConnectIt concepts={["velocity"]} explainers={["how-do-rockets-reach-orbit"]} />
```

Every lesson follows the rhythm **See it → Do it → Check it → Connect it**.

### 8.4 Questions (`content/questions/**/*.yaml`)
Questions are **never shipped to the client with their answers**. The client receives the prompt, the inputs and the hints; grading happens on the server.

Supported types for the MVP:
- `multiple-choice` (single or multi-select)
- `numeric`: value + tolerance (absolute or relative) + optional unit
- `expression`: symbolic equivalence (`2(x+1)` ≡ `2x+2`), variables declared
- `parametrised`: numeric or expression with randomised `params` (seeded per attempt so a reload doesn't reroll; the answer is a formula of the params)
- `code`: Python tests run in the Pyodide worker. For code, the tests run client-side and the server records the result (acceptable for MVP; note it as a known limitation).
- `self-check`: rubric shown after the learner's attempt, used for open answers

```yaml
id: mech.projectile.range-1
type: parametrised
concepts: [projectile-motion]
params:
  v: { min: 10, max: 30, step: 1 }     # m/s
  angle: { choices: [30, 45, 60] }     # degrees
prompt: "A ball is launched at {v} m/s at {angle}° on flat ground (g = 9.81 m/s²). How far does it land?"
answer: "v^2 * sin(2 * angle deg) / 9.81"
tolerance: { relative: 0.02 }
unit: m
hints:
  - "Split the velocity into horizontal and vertical components."
  - "Time of flight is 2·v·sin(θ)/g."
solution: |
  Range R = v² sin(2θ) / g …
```

### 8.5 Interactive registry
`components/interactives/registry.ts` maps ids to lazy-loaded React components with a Zod schema for their props. MDX uses `<Interactive id="…" props={…} />`; unknown ids or invalid props fail content validation. Each interactive must:
- work with mouse, touch and keyboard (sliders reachable by Tab, arrow keys adjust)
- respect `prefers-reduced-motion`
- provide a text description for screen readers
- expose an optional "goal" mode so a lesson can say "make the ball land in the target" and get a completion event

### 8.6 Content validation (`pnpm content:check`)
It runs in CI and fails on:
- duplicate ids, or a missing referenced concept, question, interactive, explainer or project
- cycles in the prerequisite graph
- a lesson whose `requires` includes a concept that is taught *later* in the same course (warn)
- questions with no concepts, a parametrised answer that errors for some params, or missing hints for non-trivial questions
- concepts that are never taught anywhere (warn)

---

## 9. Learning engine

All of these live in `lib/` as pure functions with thorough unit tests.

### 9.1 Grading (`lib/grading`)
`grade(question, response, context) → { correct: boolean, score: 0..1, feedback?: string }`. One checker per type. Numeric checking handles tolerance and common unit mistakes (e.g. a degrees/radians hint). Expression checking normalises input (implicit multiplication, `^`, unicode minus) before comparing.

### 9.2 Mastery (`lib/mastery`)
Keep it simple, explicit and tunable (constants in one file):
- each attempt updates mastery for every concept tagged on the question
- correct with no hints: big increase; correct with hints: smaller increase; wrong: decrease; repeated wrong answers on the same item weigh less
- statuses: `<0.3 learning`, `0.3–0.8 practicing`, `≥0.8 mastered` (on top of `new` when there's no data)
- mastering a concept creates a review card

### 9.3 Spaced review (`lib/review`)
Use `ts-fsrs`. A review session pulls the due cards, picks 1–2 questions per concept (preferring parametrised ones, so the numbers change), and updates both the FSRS card and mastery.

### 9.4 Recommendations and gaps (`lib/recommend`)
- **Next step** in a course: the first incomplete lesson whose `requires` are all at least `practicing`; otherwise suggest the missing prerequisite's mini-lesson.
- **Before starting a lesson or milestone:** show "You'll use: …" chips coloured by mastery, with a one-click "refresh this concept" link.
- **For a project:** a "readiness" percentage and a list of the concepts to learn first, linking to the lessons that teach them.

---

## 10. Pages and UX

- **Landing**: the three entry points, a few explainer questions as cards, a "start in 10 seconds" interactive above the fold.
- **Explore**: grid of question cards filterable by subject. Explainer page with a depth switcher (Intuition / Mechanism / Maths / Build it) and "you might also wonder…" links.
- **Courses**: catalog by subject and level. The course page shows its modules, lessons, progress and concept chips. The lesson page has a step navigator, a sticky progress bar and keyboard shortcuts (←/→ between steps).
- **Projects**: catalog; project page with readiness, milestones and concepts; milestone page with instructions, editor or interactive, checks and a "stuck?" hint ladder.
- **Concept page** (`/concepts/[id]`): summary, mini-lesson, prerequisites, "used in" (lessons, explainers, projects), the learner's mastery.
- **Knowledge map** (`/map`): interactive graph of concepts coloured by mastery (new = gray, learning = amber, practicing = blue, mastered = green), filter by subject or course, click a node to open its concept page. Colour must never be the only signal; add a shape or icon per status.
- **Dashboard**: continue where you left off, reviews due, recommended next steps, recent achievements (kept light, with no aggressive gamification).
- **Review**: a focused, distraction-free session UI.

Design principles: calm, readable and content-first. Body text up to about 70ch wide with generous line height. Fully working dark mode. WCAG 2.2 AA. Mobile-first: every interactive and code lab must be usable on a phone (code labs may show a "better on a bigger screen" note but must still work).

---

## 11. Data model (Prisma sketch, refine as needed)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String?
  email         String?  @unique
  image         String?
  locale        String   @default("en")
  createdAt     DateTime @default(now())
  accounts      Account[]
  sessions      Session[]
  attempts      Attempt[]
  mastery       ConceptMastery[]
  reviewCards   ReviewCard[]
  lessonProgress  LessonProgress[]
  projectProgress MilestoneProgress[]
}

// Account, Session, VerificationToken: standard Auth.js models

model Attempt {
  id         String   @id @default(cuid())
  userId     String
  questionId String              // content id
  contextId  String              // lesson / milestone / review id
  seed       Int?                // for parametrised questions
  response   Json
  correct    Boolean
  score      Float
  hintsUsed  Int      @default(0)
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, questionId])
}

model ConceptMastery {
  userId    String
  conceptId String
  score     Float    @default(0)
  status    String   @default("new")
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, conceptId])
}

model ReviewCard {
  userId    String
  conceptId String
  fsrs      Json
  due       DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, conceptId])
  @@index([userId, due])
}

model LessonProgress {
  userId      String
  lessonKey   String            // course/module/lesson
  status      String            // started | completed
  lastStep    Int     @default(0)
  completedAt DateTime?
  user        User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, lessonKey])
}

model MilestoneProgress {
  userId       String
  projectId    String
  milestoneId  String
  status       String           // locked | in_progress | passed
  submission   Json?
  updatedAt    DateTime @updatedAt
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([userId, projectId, milestoneId])
}
```

Guests: keep progress in `localStorage` (wrapped in try/catch) and merge it into the account on first sign-in.

---

## 12. Seed content for the MVP spine

Write **real, accurate, complete** content for everything marked ✅. Items marked ◻️ should exist in the graph and catalog with titles, summaries and concept links, and show as "coming soon".

### Course 1: Calculus essentials (maths)
- ✅ Module 1, *Change and limits*: rates of change from data; limits intuition; continuity
- ✅ Module 2, *Derivatives*: what is a derivative; derivative rules (power, sum, product, chain); derivatives in motion (position → velocity → acceleration)
- ◻️ Module 3, *Integrals*: accumulation and area; Riemann sums; fundamental theorem
- ✅ Module 4, *Numerical methods*: Euler's method (the bridge to simulation)

### Course 2: Classical mechanics (physics), reusing the calculus concepts
- ✅ Module 1, *Describing motion*: 1D kinematics; vectors; 2D and projectile motion
- ✅ Module 2, *Forces*: Newton's laws; free-body diagrams; gravity and weight; drag
- ◻️ Module 3, *Energy and momentum*

### Course 3: Python for scientists (computing)
- ✅ Module 1, *Basics*: variables, arithmetic, functions, loops, lists
- ✅ Module 2, *Scientific Python*: NumPy arrays, plotting with matplotlib, writing a simulation loop

### Capstone project: Rocket flight simulator
Milestones, each with starter code, automated tests in the Pyodide worker and linked concepts:
1. Move a point at constant velocity in a time loop
2. Add gravity with Euler integration; compare with the analytic solution
3. Launch at an angle; compute the range and check it against the formula
4. Add thrust and burning fuel (changing mass)
5. Add air drag; observe how it changes the trajectory
6. Plot altitude vs time and tune the launch so it reaches a target altitude

### Mini projects (one per completed module where it makes sense)
For example *Tangent line explorer* or *Hit the target* (a projectile sim in goal mode).

### Explainers (Explore), all four layers each
- ✅ How does a rocket reach orbit?
- ✅ Why do a hammer and a feather fall at the same rate?
- ✅ How do video games simulate physics?
- ◻️ How does your phone know which way is up?
- ◻️ How does a calculator compute sin(x)?

### Interactives to build
`tangent-zoom`, `derivative-explorer` (drag a point, see the slope and the derivative graph), `riemann-sum`, `vector-add`, `projectile-sim` (speed, angle, gravity, drag toggle, target goal mode), `free-body-builder`, `euler-stepper` (step size vs error).

Aim for 4–8 questions per lesson, at least a third of them parametrised, with hints and full worked solutions.

---

## 13. Phased plan and acceptance criteria

**Phase 0: Foundations**
Scaffold Next.js + TS strict, Tailwind, shadcn/ui, ESLint/Prettier, Vitest, Playwright, Prisma + docker Postgres, next-intl scaffolding, the app shell (header, nav to Explore/Courses/Projects, theme toggle), `CLAUDE.md`, `.env.example`, CI.
✅ `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm e2e` all work; CI is green; dark mode works.

**Phase 1: Content pipeline and reading**
Content layer, Zod schemas, MDX components (Step, Callout, WorkedExample, ConnectIt), KaTeX, Shiki, the content validator, course/lesson/explainer/concept pages, and one complete sample lesson and explainer.
✅ The validator catches each error listed in 8.6 (with tests); the sample lesson renders correctly on mobile and desktop.

**Phase 2: Interactivity and grading**
Interactive registry plus `tangent-zoom`, `projectile-sim` and `euler-stepper`; the Question block with server-side grading for all MVP types; the hint ladder and worked solutions; CodeLab with the Pyodide worker, tests and output panel (including matplotlib plots).
✅ Unit tests cover every grader, including edge cases (equivalent expressions, tolerance borders, unit hints). Answers never appear in the client bundle or the network payloads (add a test). Code labs run offline after first load.

**Phase 3: Accounts and progress**
Auth.js, persisting attempts and lesson progress, the mastery engine, the dashboard, guest progress plus merge on sign-in.
✅ An e2e test covers: guest answers questions → signs in → progress is preserved → mastery is updated.

**Phase 4: Knowledge graph and review**
Graph builder from content, concept chips with mastery, the prerequisite "You'll use" panel, the `/map` page, recommendations, FSRS review sessions.
✅ The map renders the full seed graph legibly; recommendations are unit-tested on fixture graphs; a review session updates the cards.

**Phase 5: Projects**
Project and milestone pages, readiness, milestone checks, progress, the capstone wired up.
✅ The capstone can be completed end to end in the browser, and each milestone's tests pass with a reference solution (keep the reference solutions in a test fixture, not in the client).

**Phase 6: Content**
Write all ✅ content from section 12 plus the remaining interactives.
✅ `content:check` passes with no warnings; every code sample and parametrised answer is verified by a script; I can read a lesson start to finish and it teaches well.

**Phase 7 (optional, behind `FEATURE_AI_TUTOR`): AI tutor**
An "Ask why" panel on lessons and milestones using the Anthropic API, grounded only in the current lesson, its concepts and its prerequisites. It is hint-first: it never gives the final answer to a question the learner hasn't attempted, and it tells the learner when something is outside the lesson's scope. It is rate-limited, and the API key stays server-side only.

**Phase 8: Polish and deploy**
Accessibility audit (axe in Playwright), Lighthouse ≥ 90 on key pages, loading and empty states, error boundaries, SEO metadata and Open Graph images for explainers, sitemap, Vercel deploy docs.

---

## 14. Definition of done (every phase)

- Lint, typecheck, unit tests, e2e tests and the content validator all pass in CI
- New logic has unit tests; new pages have at least a smoke e2e test
- Works on a 375px-wide phone and on desktop, in light and dark mode, using only the keyboard
- `CLAUDE.md` is updated
- The end-of-phase summary tells me: what was built, how to try it, known limitations, and the proposed next step

Start with **Phase 0**. First, give me your plan for Phase 0 and any questions you have about this brief.
