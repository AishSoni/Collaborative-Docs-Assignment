import { describe, it, expect } from 'vitest';
import { applyUpdate } from '../../src/modules/docs/domain/merge.js';
import type { Document } from '../../src/modules/docs/domain/Document.js';

const doc: Document = {
  id: 'doc1',
  title: 'Test',
  content: { type: 'doc', content: [] },
  ownerId: 'alice',
  version: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('merge', () => {
  it('applies update with matching version', () => {
    const result = applyUpdate(doc, { title: 'New Title' }, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('New Title');
      expect(result.value.version).toBe(3);
    }
  });

  it('returns ConflictError on version mismatch', () => {
    const result = applyUpdate(doc, { title: 'New Title' }, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.name).toBe('ConflictError');
    }
  });

  it('coerces empty title to Untitled', () => {
    const result = applyUpdate(doc, { title: '' }, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.title).toBe('Untitled');
    }
  });

  it('does not mutate input', () => {
    const original = { ...doc, content: { ...doc.content } };
    applyUpdate(doc, { title: 'Changed' }, 2);
    expect(doc.title).toBe(original.title);
    expect(doc.version).toBe(original.version);
  });

  it('preserves content when only title is updated', () => {
    const content = { type: 'doc', content: [{ type: 'paragraph' }] };
    const docWithContent = { ...doc, content };
    const result = applyUpdate(docWithContent, { title: 'New' }, 2);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.content).toEqual(content);
    }
  });
});
