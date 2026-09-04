// Prisma 7 removed its own automatic .env loading (previously an incidental side effect of a
// bare `new PrismaClient()` reading the schema's env("DATABASE_URL") reference) -- next dev/build
// still load .env via Next's own separate mechanism, but standalone scripts run via `tsx` outside
// Next's process (scripts/set-plan-override.ts, scripts/migrate-photos-to-blob.ts) don't get that
// for free anymore. dotenv's config() only fills in unset vars, so this is a no-op when Next (or
// the shell) already populated process.env.
import "dotenv/config";
import ws from "ws";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { neonConfig } from "@neondatabase/serverless";

// If no global WebSocket is available, @neondatabase/serverless needs an explicit constructor --
// harmless to set even where one already exists.
neonConfig.webSocketConstructor = ws;

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL ?? "";

/**
 * PrismaNeonHttp (Neon's stateless fetch-based driver) was tried here first and reverted --
 * its startTransaction() unconditionally rejects with "Transactions are not supported in HTTP
 * mode" (confirmed by reading @prisma/adapter-neon's own source), which silently broke every
 * prisma.$transaction() call in the app the moment this went to production (account deletion,
 * markListingSold, save/publish draft, bulk price updates -- discovered live via a hung password-
 * reset submit). PrismaNeon (the WebSocket-based adapter) implements real transactions and is
 * still Neon-specific/serverless-appropriate, just not stateless-HTTP. Local dev (Docker Postgres,
 * not Neon) is unaffected either way -- it already used PrismaPg, which always supported
 * transactions.
 */
const useNeon = process.env.NODE_ENV === "production" || /\.neon\.tech/.test(connectionString);

function createClient() {
  const adapter = useNeon
    ? new PrismaNeon({ connectionString })
    : new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
