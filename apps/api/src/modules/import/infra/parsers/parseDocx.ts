import mammoth from 'mammoth';
import type { TiptapDoc, TiptapNode } from '../../../content/tiptap-types.js';

function htmlToTiptapNodes(html: string): TiptapNode[] {
  const nodes: TiptapNode[] = [];
  const tagRegex = /<(h[1-3]|p|ul|ol|li|strong|em|u|br)(?:\s[^>]*)?>([\s\S]*?)<\/\1>|<(h[1-3]|p|ul|ol|li|strong|em|u|br)(?:\s[^>]*)?(?:\/)?>/gi;
  let match;

  while ((match = tagRegex.exec(html)) !== null) {
    const tag = (match[1] || match[3] || '').toLowerCase();
    const content = (match[2] || '').replace(/<[^>]+>/g, '').trim();

    if (!content && tag !== 'br') continue;

    switch (tag) {
      case 'h1':
      case 'h2':
      case 'h3':
        nodes.push({
          type: 'heading',
          attrs: { level: parseInt(tag[1]) },
          content: content ? [{ type: 'text', text: content }] : [],
        });
        break;
      case 'p':
        nodes.push({
          type: 'paragraph',
          content: content ? [{ type: 'text', text: content }] : [],
        });
        break;
      case 'ul':
        nodes.push({
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }],
        });
        break;
      case 'ol':
        nodes.push({
          type: 'orderedList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: content }] }] }],
        });
        break;
      case 'strong':
        nodes.push({
          type: 'text',
          text: content,
          marks: [{ type: 'bold' }],
        });
        break;
      case 'em':
        nodes.push({
          type: 'text',
          text: content,
          marks: [{ type: 'italic' }],
        });
        break;
      case 'u':
        nodes.push({
          type: 'text',
          text: content,
          marks: [{ type: 'underline' }],
        });
        break;
    }
  }

  if (nodes.length === 0 && html.trim()) {
    const text = html.replace(/<[^>]+>/g, '').trim();
    if (text) {
      nodes.push({
        type: 'paragraph',
        content: [{ type: 'text', text }],
      });
    }
  }

  return nodes;
}

export async function parseDocx(buffer: Buffer): Promise<TiptapDoc> {
  const result = await mammoth.convertToHtml({ buffer });
  const nodes = htmlToTiptapNodes(result.value);

  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : [{ type: 'paragraph', content: [] }],
  };
}
