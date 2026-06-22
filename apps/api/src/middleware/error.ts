import { getBaseLogger } from '../infra/logger/pino.js';
import { getRequestContext } from '../infra/logger/request-context.js';
import type { ErrorHandler } from 'hono';

class DomainError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'DomainError';
    this.statusCode = statusCode;
  }
}

export const errorHandler: ErrorHandler = (err, c) => {
  const ctx = getRequestContext();
  const base = getBaseLogger();
  const log = ctx ? base.child({ reqId: ctx.reqId, userId: ctx.userId }) : base;

  if (err instanceof DomainError) {
    log.warn({ err, statusCode: err.statusCode }, err.message);
    return c.json({ error: err.message }, err.statusCode as any);
  }

  const statusCode = (err as any).statusCode;
  if (statusCode && typeof statusCode === 'number' && statusCode >= 400 && statusCode < 600) {
    log.warn({ err, statusCode }, err.message);
    return c.json({ error: err.message }, statusCode as any);
  }

  log.error({ err }, 'Unexpected error');
  return c.json({ error: 'Internal server error' }, 500);
};
