import type { TiptapDoc, TiptapNode, TiptapMark } from './tiptap-types.js';

const ALLOWED_NODE_TYPES = new Set([
  'doc',
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'listItem',
  'text',
]);

const ALLOWED_MARK_TYPES = new Set(['bold', 'italic', 'underline']);

const ALLOWED_HEADING_LEVELS = new Set([1, 2, 3]);

function sanitizeNode(node: TiptapNode): TiptapNode | null {
  if (!ALLOWED_NODE_TYPES.has(node.type)) {
    return null;
  }

  const sanitized: TiptapNode = { type: node.type };

  if (node.type === 'heading' && node.attrs) {
    const level = node.attrs.level;
    if (typeof level === 'number' && ALLOWED_HEADING_LEVELS.has(level)) {
      sanitized.attrs = { level };
    } else {
      sanitized.attrs = { level: 1 };
    }
  } else if (node.attrs) {
    sanitized.attrs = { ...node.attrs };
  }

  if (node.content) {
    const cleanContent = node.content
      .map((child) => sanitizeNode(child))
      .filter((child): child is TiptapNode => child !== null);
    if (cleanContent.length > 0) {
      sanitized.content = cleanContent;
    }
  }

  if (node.text !== undefined) {
    sanitized.text = node.text;
  }

  if (node.marks) {
    const cleanMarks = node.marks
      .filter((mark) => ALLOWED_MARK_TYPES.has(mark.type))
      .map((mark): TiptapMark => {
        const m: TiptapMark = { type: mark.type };
        if (mark.attrs) m.attrs = { ...mark.attrs };
        return m;
      });
    if (cleanMarks.length > 0) {
      sanitized.marks = cleanMarks;
    }
  }

  return sanitized;
}

export function sanitize(tiptap: TiptapDoc): TiptapDoc {
  if (!tiptap || tiptap.type !== 'doc') {
    return { type: 'doc', content: [] };
  }

  const cleanContent = (tiptap.content || [])
    .map((node) => sanitizeNode(node))
    .filter((node): node is TiptapNode => node !== null);

  return {
    type: 'doc',
    content: cleanContent,
  };
}

export function isSafe(tiptap: TiptapDoc): boolean {
  const sanitized = sanitize(tiptap);
  return JSON.stringify(sanitized) === JSON.stringify(tiptap);
}
