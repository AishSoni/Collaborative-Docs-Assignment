'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Document, User, Share, DocsList } from 'shared';

export const queryKeys = {
  docs: ['docs'] as const,
  doc: (id: string) => ['doc', id] as const,
  docShares: (id: string) => ['doc', id, 'shares'] as const,
  users: ['users'] as const,
};

export function useDocs() {
  return useQuery<DocsList>({
    queryKey: queryKeys.docs,
    queryFn: async () => {
      const { data } = await apiClient.get('/docs');
      return data;
    },
  });
}

export function useDoc(id: string) {
  return useQuery<Document & { shares: Share[] }>({
    queryKey: queryKeys.doc(id),
    queryFn: async () => {
      const { data } = await apiClient.get(`/docs/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUsers() {
  return useQuery<User[]>({
    queryKey: queryKeys.users,
    queryFn: async () => {
      const { data } = await apiClient.get('/users');
      return data;
    },
  });
}
