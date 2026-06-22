'use client';

import { useDocs } from '@/api/queries';
import { useCreateDoc, useDeleteDoc, useImportDoc } from '@/api/mutations';
import { UserSwitcher } from './UserSwitcher';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';

export function DocumentList() {
  const { data, isLoading, error } = useDocs();
  const createDoc = useCreateDoc();
  const deleteDoc = useDeleteDoc();
  const importDoc = useImportDoc();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const doc = await createDoc.mutateAsync();
    router.push(`/docs/${doc.id}`);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const doc = await importDoc.mutateAsync(file);
      router.push(`/docs/${doc.id}`);
    } catch (err: any) {
      alert(err.message || 'Import failed');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      await deleteDoc.mutateAsync(id);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-gray-500">Loading documents...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-red-500">
          Failed to load documents. Please refresh.
        </div>
      </div>
    );
  }

  const owned = data?.owned || [];
  const shared = data?.shared || [];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ajaia Docs</h1>
        <div className="flex items-center gap-3">
          <UserSwitcher />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={importDoc.isPending}
          >
            Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.txt,.docx"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={handleCreate}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={createDoc.isPending}
          >
            {createDoc.isPending ? 'Creating...' : 'New Document'}
          </button>
        </div>
      </div>

      {owned.length === 0 && shared.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500 text-lg mb-4">No documents yet</p>
          <p className="text-gray-400 text-sm">
            Create a new document or import a file to get started.
          </p>
        </div>
      )}

      {owned.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">My Documents</h2>
          <div className="space-y-2">
            {owned.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <Link href={`/docs/${doc.id}`} className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                  <div className="text-xs text-gray-500">
                    Updated {new Date(doc.updatedAt).toLocaleDateString()}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  className="ml-3 text-sm text-red-500 hover:text-red-700 px-2 py-1"
                  aria-label={`Delete ${doc.title}`}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {shared.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Shared with me</h2>
          <div className="space-y-2">
            {shared.map((doc) => (
              <Link
                key={doc.id}
                href={`/docs/${doc.id}`}
                className="block p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                <div className="text-xs text-gray-500">
                  Updated {new Date(doc.updatedAt).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
