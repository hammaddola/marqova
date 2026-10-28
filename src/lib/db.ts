import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // DATABASE_CA: PEM of a private root CA (e.g. Supabase) so TLS stays fully verified.
  const ca = process.env.DATABASE_CA;
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL, ...(ca && { ssl: { ca } }) });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
