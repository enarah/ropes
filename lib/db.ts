import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env["DATABASE_URL"];

const globalForPrisma = globalThis as unknown as {
  ropesPrisma?: PrismaClient;
};

export function isDatabaseConfigured() {
  return Boolean(databaseUrl);
}

export function getPrismaClient() {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (!globalForPrisma.ropesPrisma) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    globalForPrisma.ropesPrisma = new PrismaClient({ adapter });
  }

  return globalForPrisma.ropesPrisma;
}
