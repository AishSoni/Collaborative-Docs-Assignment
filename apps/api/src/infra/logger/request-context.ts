import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  reqId: string;
  userId?: string;
}

export const requestContextStore = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return requestContextStore.getStore();
}
