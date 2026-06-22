'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { queryKeys } from './queries';
import type { Document, Share } from 'shared';

export function useCreateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data?: { title?: string }) => {
      const { data: doc } = await apiClient.post('/docs', data || {});
      return doc as Document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.docs });
    },
  });
}

export function useUpdateDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      id: string;
      title?: string;
      content?: unknown;
      version: number;
    }) => {
      const { id, ...body } = data;
      const { data: doc } = await apiClient.patch(`/docs/${id}`, body);
      return doc as Document;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.docs });
      qc.invalidateQueries({ queryKey: queryKeys.doc(variables.id) });
    },
  });
}

export function useDeleteDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/docs/${id}`);
    },
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.docs });
      qc.removeQueries({ queryKey: queryKeys.doc(id) });
    },
  });
}

export function useGrantShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      docId: string;
      granteeId: string;
      role?: 'EDITOR';
    }) => {
      const { data: share } = await apiClient.post(
        `/docs/${data.docId}/shares`,
        { granteeId: data.granteeId, role: data.role || 'EDITOR' }
      );
      return share as Share;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.docShares(variables.docId) });
      qc.invalidateQueries({ queryKey: queryKeys.docs });
    },
  });
}

export function useRevokeShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { docId: string; userId: string }) => {
      await apiClient.delete(`/docs/${data.docId}/shares/${data.userId}`);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.docShares(variables.docId) });
      qc.invalidateQueries({ queryKey: queryKeys.docs });
    },
  });
}

export function useImportDoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const { data: doc } = await apiClient.post('/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return doc as Document;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.docs });
    },
  });
}
