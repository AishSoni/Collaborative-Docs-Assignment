'use client';

import { Editor } from '@/components/Editor';
import { useParams } from 'next/navigation';

export default function DocPage() {
  const params = useParams();
  const docId = params.id as string;

  return <Editor docId={docId} />;
}
