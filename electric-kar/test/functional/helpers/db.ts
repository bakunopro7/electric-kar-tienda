import { PrismaService } from '../../../src/prisma/prisma.service';

/** Wipes every table in the public schema (except the Prisma migration ledger). */
export async function truncateAll(prisma: PrismaService): Promise<void> {
  const rows = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables
     WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  if (rows.length === 0) return;
  const list = rows.map((r) => `"${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${list} RESTART IDENTITY CASCADE;`,
  );
}
