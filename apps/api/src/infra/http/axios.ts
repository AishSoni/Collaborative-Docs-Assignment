import axios from 'axios';
import { getRequestContext } from '../logger/request-context.js';
import { getBaseLogger } from '../logger/pino.js';

export const httpClient = axios.create({
  timeout: 10_000,
});

httpClient.interceptors.request.use((config) => {
  const ctx = getRequestContext();
  if (ctx) {
    config.headers.set('X-Request-Id', ctx.reqId);
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => {
    const base = getBaseLogger();
    base.debug(
      { outbound: response.config.url, status: response.status },
      'outbound request completed'
    );
    return response;
  },
  (error) => {
    const base = getBaseLogger();
    base.debug(
      { outbound: error.config?.url, status: error.response?.status },
      'outbound request failed'
    );
    return Promise.reject(error);
  }
);
