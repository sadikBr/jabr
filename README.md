# Jabr

A learning-by-doing platform for maths, physics, engineering and software:
interactive simulations, live code and real projects on one shared concept
graph. It is a responsive web app that installs on desktop and phone.

- Product brief and phase plan: [PROJECT_BRIEF.md](./PROJECT_BRIEF.md)
- How to run, conventions and decisions: [AGENTS.md](./AGENTS.md)

## Quick start

```bash
cp .env.example .env
bun install
bun run dev
```

Open http://localhost:3000. The database is optional until accounts arrive;
to start it, run `bun run db:up` and then `bun run db:deploy`.

## Checks

```bash
bun run check
bun run e2e
```
