import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Read directly (not via env()) so `prisma generate` works without a
  // database URL, e.g. on install and in CI jobs that never touch the DB.
  datasource: { url: process.env.DATABASE_URL ?? "" },
});
