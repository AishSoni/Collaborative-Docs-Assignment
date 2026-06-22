'use client';

import { useState, useEffect } from 'react';
import { useUsers, useDoc } from '@/api/queries';
import { useGrantShare, useRevokeShare } from '@/api/mutations';
import { getCurrentUserId } from '@/lib/user';

interface ShareDialogProps {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareDialog({ docId, isOpen, onClose }: ShareDialogProps) {
  const { data: users } = useUsers();
  const { data: doc } = useDoc(docId);
  const grantShare = useGrantShare();
  const revokeShare = useRevokeShare();
  const [selectedUserId, setSelectedUserId] = useState('');
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    if (users && users.length > 0 && !selectedUserId) {
      const other = users.find((u) => u.id !== currentUserId);
      if (other) setSelectedUserId(other.id);
    }
  }, [users, currentUserId, selectedUserId]);

  if (!isOpen) return null;

  const sharedUserIds = new Set(doc?.shares?.map((s) => s.granteeId) || []);
  const otherUsers = users?.filter((u) => u.id !== currentUserId) || [];

  const handleGrant = async () => {
    if (!selectedUserId) return;
    await grantShare.mutateAsync({ docId, granteeId: selectedUserId });
  };

  const handleRevoke = async (userId: string) => {
    await revokeShare.mutateAsync({ docId, userId });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Share "{doc?.title}"</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Grant access to
          </label>
          <div className="flex gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
            >
              {otherUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleGrant}
              disabled={!selectedUserId || grantShare.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {grantShare.isPending ? 'Sharing...' : 'Share'}
            </button>
          </div>
        </div>

        {sharedUserIds.size > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Currently shared with</h3>
            <div className="space-y-2">
              {otherUsers
                .filter((u) => sharedUserIds.has(u.id))
                .map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: u.color }}
                      />
                      <span className="text-sm">{u.name}</span>
                      <span className="text-xs text-gray-500">(editor)</span>
                    </div>
                    <button
                      onClick={() => handleRevoke(u.id)}
                      disabled={revokeShare.isPending}
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
