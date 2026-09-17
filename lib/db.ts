import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  ropesPrisma?: PrismaClient;
  ropesPrismaDatabaseUrl?: string;
};

function getDatabaseUrl() {
  return process.env["DATABASE_URL"] ?? "";
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl());
}

export function getPrismaClient() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  if (
    !globalForPrisma.ropesPrisma ||
    globalForPrisma.ropesPrismaDatabaseUrl !== databaseUrl
  ) {
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    globalForPrisma.ropesPrisma = new PrismaClient({ adapter });
    globalForPrisma.ropesPrismaDatabaseUrl = databaseUrl;
  }

  return globalForPrisma.ropesPrisma;
}
