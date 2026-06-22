import type { TiptapDoc, TiptapNode } from '../../../content/tiptap-types.js';

export function parseText(content: string): TiptapDoc {
  const paragraphs = content.split(/\n\n+/);

  const nodes: TiptapNode[] = paragraphs
    .filter((p) => p.trim().length > 0)
    .map((p) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: p.trim() }],
    }));

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }],
  };
}
