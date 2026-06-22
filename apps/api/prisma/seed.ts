import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SEED_USERS = [
  { id: 'alice', name: 'Alice', email: 'alice@ajaia.dev', color: '#E57373' },
  { id: 'bob', name: 'Bob', email: 'bob@ajaia.dev', color: '#64B5F6' },
  { id: 'carol', name: 'Carol', email: 'carol@ajaia.dev', color: '#81C784' },
];

async function main() {
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }
  console.log('Seeded users:', SEED_USERS.map((u) => u.name).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
