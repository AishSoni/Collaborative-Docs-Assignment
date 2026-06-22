'use client';

import { useUsers } from '@/api/queries';
import { getCurrentUserId, setCurrentUserId } from '@/lib/user';
import { useEffect, useState } from 'react';

export function UserSwitcher() {
  const { data: users } = useUsers();
  const [currentUserId, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    setCurrentUser(getCurrentUserId());
  }, []);

  const handleChange = (userId: string) => {
    setCurrentUserId(userId);
    setCurrentUser(userId);
    window.location.reload();
  };

  if (!users) return null;

  const currentUser = users.find((u) => u.id === currentUserId);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-600">Signed in as</span>
      <select
        value={currentUserId || ''}
        onChange={(e) => handleChange(e.target.value)}
        className="border border-gray-300 rounded px-2 py-1 text-sm bg-white"
        aria-label="Select user"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name}
          </option>
        ))}
      </select>
      {currentUser && (
        <span
          className="w-3 h-3 rounded-full inline-block"
          style={{ backgroundColor: currentUser.color }}
        />
      )}
    </div>
  );
}
