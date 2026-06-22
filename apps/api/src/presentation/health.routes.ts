import { Hono } from 'hono';
import { getPrisma } from '../infra/db/prisma.js';

const health = new Hono();

health.get('/health', async (c) => {
  let dbStatus: 'ok' | 'error' = 'ok';
  let seededUsers = 0;

  try {
    const prisma = getPrisma();
    await prisma.$queryRaw`SELECT 1`;
    seededUsers = await prisma.user.count();
  } catch {
    dbStatus = 'error';
  }

  return c.json({
    ok: dbStatus === 'ok',
    db: dbStatus,
    seededUsers,
    version: '1.0.0',
  });
});

export { health };
