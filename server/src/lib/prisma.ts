import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  errorFormat: 'pretty',
});

export type PrismaTransaction = Parameters<typeof prisma.$transaction>[0];
