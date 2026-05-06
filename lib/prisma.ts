import fs from "node:fs";
import path from "node:path";
import { config as loadDotenv, parse as parseDotenv } from "dotenv";
import { PrismaClient } from "@prisma/client";

function resolveDatabaseUrl() {
  const envPath = path.join(process.cwd(), ".env");

  try {
    const envFile = fs.readFileSync(envPath, "utf8");
    const parsed = parseDotenv(envFile);
    if (parsed.DATABASE_URL) {
      return parsed.DATABASE_URL;
    }
  } catch {
    // Fallback to process.env when .env is unavailable.
  }

  loadDotenv({ path: envPath, override: false });
  return process.env.DATABASE_URL;
}

const databaseUrl = resolveDatabaseUrl();

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

function hasLatestDelegates(client: PrismaClient | undefined) {
  const prismaClient = client as PrismaClient & {
    partner?: unknown;
    taskTemplate?: unknown;
    shiftTaskTemplate?: unknown;
  };

  return Boolean(prismaClient?.partner) && Boolean(prismaClient?.taskTemplate) && Boolean(prismaClient?.shiftTaskTemplate);
}

export const prisma =
  globalForPrisma.prisma &&
  globalForPrisma.prismaUrl === databaseUrl &&
  hasLatestDelegates(globalForPrisma.prisma)
    ? globalForPrisma.prisma
    :
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaUrl = databaseUrl;
}
