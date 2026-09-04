import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.cjs",
  },
  // This is the connection Migrate (migrate deploy/dev, db push) uses to run DDL -- DIRECT_URL,
  // not DATABASE_URL, matching Neon's own pooled-vs-direct split (DATABASE_URL goes through
  // Neon's pgbouncer-style pooler, which schema-changing operations don't reliably work through).
  // The app's own runtime queries use DATABASE_URL directly via the adapter constructed in
  // lib/prisma.ts -- a separate concern from what Migrate needs here.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
