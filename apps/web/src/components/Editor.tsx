'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { useDoc } from '@/api/queries';
import { useUpdateDoc } from '@/api/mutations';
import { Toolbar } from './Toolbar';
import { ShareDialog } from './ShareDialog';
import { AccessDenied } from './AccessDenied';
import Link from 'next/link';

interface EditorProps {
  docId: string;
}

export function Editor({ docId }: EditorProps) {
  const { data: doc, isLoading, error } = useDoc(docId);
  const updateDoc = useUpdateDoc();
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [shareOpen, setShareOpen] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const versionRef = useRef<number>(0);
  const isInitialLoad = useRef(true);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: undefined,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose max-w-none focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        saveContent(editor.getJSON());
      }, 1500);
      setSaveStatus('saving');
    },
  });

  useEffect(() => {
    if (doc && editor && isInitialLoad.current) {
      editor.commands.setContent(doc.content || { type: 'doc', content: [] });
      setTitle(doc.title);
      versionRef.current = doc.version;
      isInitialLoad.current = false;
    }
  }, [doc, editor]);

  const saveContent = useCallback(
    async (content: unknown) => {
      if (!doc) return;
      try {
        const result = await updateDoc.mutateAsync({
          id: docId,
          content,
          version: versionRef.current,
        });
        if (result) {
          versionRef.current = result.version;
          setSaveStatus('saved');
        }
      } catch (err: any) {
        if (err.status === 409) {
          setSaveStatus('error');
          alert('Document was edited elsewhere. Please refresh.');
        } else {
          setSaveStatus('error');
        }
      }
    },
    [doc, docId, updateDoc]
  );

  const handleSave = useCallback(() => {
    if (!editor || !doc) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    saveContent(editor.getJSON());
  }, [editor, doc, saveContent]);

  const handleTitleBlur = useCallback(async () => {
    if (!doc || title === doc.title) return;
    try {
      const result = await updateDoc.mutateAsync({
        id: docId,
        title,
        version: versionRef.current,
      });
      if (result) {
        versionRef.current = result.version;
      }
    } catch {
      setTitle(doc.title);
    }
  }, [doc, title, docId, updateDoc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-gray-500">Loading document...</div>
      </div>
    );
  }

  if (error) {
    if ((error as any)?.status === 403) {
      return <AccessDenied />;
    }
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center text-red-500">
          Failed to load document.
          <Link href="/" className="block mt-2 text-blue-600 hover:underline">
            Back to documents
          </Link>
        </div>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-4">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          &larr; Back to documents
        </Link>
        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${
              saveStatus === 'saved'
                ? 'text-green-600'
                : saveStatus === 'saving'
                ? 'text-yellow-600'
                : 'text-red-600'
            }`}
          >
            {saveStatus === 'saved' && 'Saved'}
            {saveStatus === 'saving' && 'Saving...'}
            {saveStatus === 'error' && 'Save failed — retry'}
          </span>
          <button
            onClick={() => setShareOpen(true)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Share
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={handleTitleBlur}
        className="w-full text-3xl font-bold border-none outline-none mb-4 bg-transparent"
        placeholder="Untitled"
      />

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Toolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>

      <ShareDialog docId={docId} isOpen={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}
