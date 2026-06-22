import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { getConfig } from './config.js';
import { getPrisma } from './infra/db/prisma.js';
import { ensureSeed } from './seed/ensureSeed.js';
import { requestContextMiddleware } from './middleware/request-context.js';
import { errorHandler } from './middleware/error.js';
import { health } from './presentation/health.routes.js';
import { users } from './modules/users/presentation/users.routes.js';
import { docs } from './modules/docs/presentation/docs.routes.js';
import { shares } from './modules/shares/presentation/shares.routes.js';
import { imp } from './modules/import/presentation/import.routes.js';

const config = getConfig();

const app = new Hono();

app.use('*', cors({ origin: config.CORS_ORIGIN }));
app.use('*', honoLogger());
app.use('*', requestContextMiddleware);

app.route('/api', health);
app.route('/api', users);
app.route('/api', docs);
app.route('/api', shares);
app.route('/api', imp);

app.onError(errorHandler);

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

async function boot() {
  const prisma = getPrisma();

  if (config.SEED_ON_BOOT) {
    const count = await ensureSeed(prisma);
    console.log(`Seeded ${count} users`);
  }

  serve(
    { fetch: app.fetch, port: config.PORT },
    (info) => {
      console.log(`Ajaia API running on http://localhost:${info.port}`);
    }
  );
}

boot().catch((err) => {
  console.error('Failed to boot:', err);
  process.exit(1);
});
