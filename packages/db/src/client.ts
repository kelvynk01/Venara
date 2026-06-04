/**
 * client.ts — the single Prisma client instance.
 *
 * All DB access goes through packages/db (Brief §6). Use the query helpers rather
 * than reaching for `prisma` directly in services where a scoped helper exists.
 * A global cache prevents exhausting connections under dev hot-reload.
 */
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export type Db = typeof prisma;
