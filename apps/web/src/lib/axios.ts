import axios from 'axios';

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function generateRequestId(): string {
  return crypto.randomUUID?.() || Math.random().toString(36).substring(2);
}

export const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15_000,
});

apiClient.interceptors.request.use((config) => {
  const userId = getCookie('ajaia_user');
  if (userId) {
    config.headers.set('X-User-Id', userId);
  }

  let reqId = config.headers.get('X-Request-Id');
  if (!reqId) {
    reqId = generateRequestId();
    config.headers.set('X-Request-Id', reqId);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = {
      message: error.response?.data?.error || error.message || 'Unknown error',
      status: error.response?.status || 500,
      data: error.response?.data,
    };
    return Promise.reject(apiError);
  }
);
