import { marked } from 'marked';
import type { TiptapDoc, TiptapNode } from '../../../content/tiptap-types.js';

function markedTokenToTiptap(token: any): TiptapNode | null {
  switch (token.type) {
    case 'heading': {
      const level = Math.min(3, Math.max(1, token.depth || 1));
      return {
        type: 'heading',
        attrs: { level },
        content: token.tokens
          ?.map((t: any) => markedTokenToTiptap(t))
          .filter(Boolean) || [],
      };
    }
    case 'paragraph':
      return {
        type: 'paragraph',
        content: token.tokens
          ?.map((t: any) => markedTokenToTiptap(t))
          .filter(Boolean) || [],
      };
    case 'text':
      return { type: 'text', text: token.text || '' };
    case 'strong':
      return {
        type: 'text',
        text: token.tokens?.map((t: any) => t.text || '').join('') || '',
        marks: [{ type: 'bold' }],
      };
    case 'em':
      return {
        type: 'text',
        text: token.tokens?.map((t: any) => t.text || '').join('') || '',
        marks: [{ type: 'italic' }],
      };
    case 'list': {
      const listType = token.ordered ? 'orderedList' : 'bulletList';
      return {
        type: listType,
        content: token.items
          ?.map((item: any) => markedTokenToTiptap(item))
          .filter(Boolean) || [],
      };
    }
    case 'listitem':
      return {
        type: 'listItem',
        content: token.tokens
          ?.map((t: any) => markedTokenToTiptap(t))
          .filter(Boolean) || [],
      };
    case 'codespan':
      return { type: 'text', text: token.text || '' };
    case 'br':
      return null;
    default:
      if (token.text) {
        return { type: 'text', text: token.text };
      }
      return null;
  }
}

export function parseMarkdown(content: string): TiptapDoc {
  const tokens = marked.lexer(content);
  const tiptapNodes = tokens
    .map((token) => markedTokenToTiptap(token))
    .filter((node): node is TiptapNode => node !== null);

  return {
    type: 'doc',
    content: tiptapNodes.length > 0 ? tiptapNodes : [{ type: 'paragraph', content: [] }],
  };
}
