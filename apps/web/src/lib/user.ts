'use client';

export function getCurrentUserId(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(^| )ajaia_user=([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
}

export function setCurrentUserId(userId: string) {
  document.cookie = `ajaia_user=${encodeURIComponent(userId)}; path=/; max-age=31536000`;
}
