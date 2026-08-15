import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

if (process.env.NODE_ENV === "production") {
  neonConfig.poolQueryViaFetch = true;
} else {
  neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL ?? "";
const pool = new Pool({ connectionString });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaNeon(pool),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
