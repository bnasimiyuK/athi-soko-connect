// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  // Force the use of DIRECT_URL to bypass connection pooler permission issues
  const connectionString = process.env.DIRECT_URL; 
  
  if (!connectionString) {
    throw new Error("DIRECT_URL is not set in .env.local");
  }
  
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}