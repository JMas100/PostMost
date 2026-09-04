// Prisma 7 removed its own automatic .env loading (previously an incidental side effect of a
// bare `new PrismaClient()` reading the schema's env("DATABASE_URL") reference) -- next dev/build
// still load .env via Next's own separate mechanism, but standalone scripts run via `tsx` outside
// Next's process (scripts/set-plan-override.ts, scripts/migrate-photos-to-blob.ts) don't get that
// for free anymore. dotenv's config() only fills in unset vars, so this is a no-op when Next (or
// the shell) already populated process.env.
import "dotenv/config";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL ?? "";

/**
 * Neon's HTTP driver speaks Neon's stateless fetch-based protocol, so it cannot reach a plain
 * Postgres server -- use it for production and any Neon-shaped connection string. Everything else
 * (e.g. local Docker Postgres) uses the standard pg driver adapter instead. HTTP-based querying
 * needs no WebSocket polyfill, unlike the pooled/WS-based Neon adapter this replaced -- one less
 * moving part for both environments.
 */
const useNeon = process.env.NODE_ENV === "production" || /\.neon\.tech/.test(connectionString);

function createClient() {
  const adapter = useNeon
    ? new PrismaNeonHttp(connectionString, {})
    : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
