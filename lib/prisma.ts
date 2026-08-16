import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL ?? "";

/**
 * The Neon serverless driver speaks Neon's HTTP/WebSocket protocol, so it cannot
 * reach a plain Postgres server. Outside production, fall back to the standard
 * TCP client for non-Neon connection strings (e.g. a local Postgres).
 */
const useNeon = process.env.NODE_ENV === "production" || /\.neon\.tech/.test(connectionString);

function createClient() {
  if (!useNeon) return new PrismaClient();

  if (process.env.NODE_ENV === "production") {
    neonConfig.poolQueryViaFetch = true;
  } else {
    neonConfig.webSocketConstructor = ws;
  }
  return new PrismaClient({ adapter: new PrismaNeon(new Pool({ connectionString })) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
