import { getBaseLogger } from './pino.js';
import { getRequestContext } from './request-context.js';

function createLoggerProxy(): any {
  const handler = {
    get(_target: any, prop: any, _receiver: any) {
      if (typeof prop === 'string' && ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(prop)) {
        return (msgOrObj: any, ...args: any[]) => {
          const ctx = getRequestContext();
          const base = getBaseLogger();
          const child = ctx ? base.child({ reqId: ctx.reqId, userId: ctx.userId }) : base;
          return (child as any)[prop](msgOrObj, ...args);
        };
      }
      return Reflect.get(_target, prop, _receiver);
    },
  };

  return new Proxy({} as any, handler);
}

export const logger = createLoggerProxy();
