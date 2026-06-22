'use client';

import Link from 'next/link';

export function AccessDenied() {
  return (
    <div className="max-w-md mx-auto mt-24 text-center">
      <div className="text-6xl mb-4">403</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
      <p className="text-gray-600 mb-6">
        You do not have permission to view this document.
      </p>
      <Link
        href="/"
        className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Back to my documents
      </Link>
    </div>
  );
}
