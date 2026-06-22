import { randomUUID } from 'node:crypto';
import { requestContextStore } from '../infra/logger/request-context.js';
import type { Context, Next } from 'hono';

export const requestContextMiddleware = async (c: Context, next: Next) => {
  const reqId = c.req.header('X-Request-Id') || randomUUID();
  const userId = c.req.header('X-User-Id');

  c.set('reqId', reqId);
  c.header('X-Request-Id', reqId);

  const store: { reqId: string; userId?: string } = { reqId };
  if (userId) store.userId = userId;

  return requestContextStore.run(store, async () => {
    await next();
  });
};
