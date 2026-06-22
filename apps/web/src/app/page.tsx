'use client';

import { DocumentList } from '@/components/DocumentList';
import { useEffect, useState } from 'react';
import { getCurrentUserId, setCurrentUserId } from '@/lib/user';

export default function HomePage() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getCurrentUserId()) {
      setCurrentUserId('alice');
    }
    setReady(true);
  }, []);

  if (!ready) return null;

  return <DocumentList />;
}
