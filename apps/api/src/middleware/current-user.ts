import { UnauthorizedError } from 'shared';
import { getRequestContext } from '../infra/logger/request-context.js';
import { UserRepository } from '../modules/users/infra/UserRepository.js';
import type { Context, Next } from 'hono';
import type { User } from '../modules/users/domain/User.js';

declare module 'hono' {
  interface ContextVariableMap {
    user: User;
    reqId: string;
  }
}

export const currentUserMiddleware = async (c: Context, next: Next) => {
  const ctx = getRequestContext();
  if (!ctx?.userId) {
    throw new UnauthorizedError('Missing X-User-Id header');
  }

  const user = await UserRepository.findById(ctx.userId);
  if (!user) {
    throw new UnauthorizedError('Unknown user');
  }

  c.set('user', user);
  await next();
};
