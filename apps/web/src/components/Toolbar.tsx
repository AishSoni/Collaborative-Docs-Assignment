'use client';

import { type Editor } from '@tiptap/react';

interface ToolbarProps {
  editor: Editor | null;
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null;

  const groups = [
    {
      label: 'Text style',
      buttons: [
        {
          label: 'Bold',
          active: editor.isActive('bold'),
          onClick: () => editor.chain().focus().toggleBold().run(),
          shortcut: 'Ctrl+B',
        },
        {
          label: 'Italic',
          active: editor.isActive('italic'),
          onClick: () => editor.chain().focus().toggleItalic().run(),
          shortcut: 'Ctrl+I',
        },
        {
          label: 'Underline',
          active: editor.isActive('underline'),
          onClick: () => editor.chain().focus().toggleUnderline().run(),
          shortcut: 'Ctrl+U',
        },
      ],
    },
    {
      label: 'Headings',
      buttons: [
        {
          label: 'H1',
          active: editor.isActive('heading', { level: 1 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          label: 'H2',
          active: editor.isActive('heading', { level: 2 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          label: 'H3',
          active: editor.isActive('heading', { level: 3 }),
          onClick: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
      ],
    },
    {
      label: 'Lists',
      buttons: [
        {
          label: 'Bullet List',
          active: editor.isActive('bulletList'),
          onClick: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          label: 'Ordered List',
          active: editor.isActive('orderedList'),
          onClick: () => editor.chain().focus().toggleOrderedList().run(),
        },
      ],
    },
  ];

  return (
    <div className="flex items-center gap-1 flex-wrap border-b border-gray-200 pb-2 mb-4">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-1">
          {gi > 0 && <div className="w-px h-6 bg-gray-200 mx-1" />}
          {group.buttons.map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              title={btn.shortcut || btn.label}
              aria-label={btn.label}
              className={`px-2 py-1 text-sm rounded ${
                btn.active
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
