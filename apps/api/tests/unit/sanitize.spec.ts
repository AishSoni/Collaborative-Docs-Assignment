import { describe, it, expect } from 'vitest';
import { sanitize, isSafe } from '../../src/modules/content/sanitize.js';
import type { TiptapDoc } from '../../src/modules/content/tiptap-types.js';

describe('sanitize', () => {
  it('passes through clean content', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
      ],
    };
    expect(sanitize(doc)).toEqual(doc);
    expect(isSafe(doc)).toBe(true);
  });

  it('strips script tags', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: '<script>alert("xss")</script>' }] },
      ],
    };
    const result = sanitize(doc);
    expect(result.content[0].content?.[0]).toEqual({ type: 'text', text: '<script>alert("xss")</script>' });
  });

  it('drops unknown node types', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'unknownNode', content: [{ type: 'text', text: 'test' }] } as any,
      ],
    };
    const result = sanitize(doc);
    expect(result.content).toHaveLength(0);
  });

  it('drops unknown marks', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        {
          type: 'text',
          text: 'Hello',
          marks: [{ type: 'bold' }, { type: 'evilMark' } as any],
        },
      ],
    };
    const result = sanitize(doc);
    expect(result.content[0].marks).toHaveLength(1);
    expect(result.content[0].marks?.[0].type).toBe('bold');
  });

  it('preserves heading levels 1-3', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'H1' }] },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'H2' }] },
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'H3' }] },
      ],
    };
    const result = sanitize(doc);
    expect(result.content).toHaveLength(3);
  });

  it('handles invalid heading level', () => {
    const doc: TiptapDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 7 }, content: [{ type: 'text', text: 'H7' }] },
      ],
    };
    const result = sanitize(doc);
    expect(result.content[0].attrs?.level).toBe(1);
  });

  it('handles non-doc root', () => {
    const doc = { type: 'notdoc', content: [] } as any;
    const result = sanitize(doc);
    expect(result).toEqual({ type: 'doc', content: [] });
  });

  it('handles null/undefined input', () => {
    expect(sanitize(null as any)).toEqual({ type: 'doc', content: [] });
    expect(sanitize(undefined as any)).toEqual({ type: 'doc', content: [] });
  });
});
