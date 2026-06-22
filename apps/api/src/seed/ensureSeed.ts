import { PrismaClient } from '@prisma/client';

const SEED_USERS = [
  { id: 'alice', name: 'Alice', email: 'alice@ajaia.dev', color: '#E57373' },
  { id: 'bob', name: 'Bob', email: 'bob@ajaia.dev', color: '#64B5F6' },
  { id: 'carol', name: 'Carol', email: 'carol@ajaia.dev', color: '#81C784' },
];

export async function ensureSeed(prisma: PrismaClient): Promise<number> {
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  return SEED_USERS.length;
}
