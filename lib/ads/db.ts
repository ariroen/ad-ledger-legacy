import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  adsPrisma?: PrismaClient;
};

export function getPrisma() {
  if (!globalForPrisma.adsPrisma) {
    globalForPrisma.adsPrisma = new PrismaClient();
  }

  return globalForPrisma.adsPrisma;
}

export const prisma = getPrisma();
