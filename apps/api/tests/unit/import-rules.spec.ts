import { describe, it, expect } from 'vitest';
import { validateUpload, deriveTitle } from '../../src/modules/import/domain/rules.js';

describe('import rules', () => {
  describe('validateUpload', () => {
    it('accepts valid .md file', () => {
      const result = validateUpload({ filename: 'test.md', size: 1000 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('.md');
    });

    it('accepts valid .txt file', () => {
      const result = validateUpload({ filename: 'test.txt', size: 1000 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('.txt');
    });

    it('accepts valid .docx file', () => {
      const result = validateUpload({ filename: 'test.docx', size: 1000 });
      expect(result.ok).toBe(true);
      if (result.ok) expect(result.value).toBe('.docx');
    });

    it('rejects oversized file', () => {
      const result = validateUpload({ filename: 'test.md', size: 3_000_000 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.name).toBe('PayloadTooLargeError');
    });

    it('rejects unsupported extension', () => {
      const result = validateUpload({ filename: 'test.pdf', size: 1000 });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.name).toBe('UnsupportedMediaError');
    });
  });

  describe('deriveTitle', () => {
    it('strips extension', () => {
      expect(deriveTitle('my-document.md')).toBe('my-document');
    });

    it('handles filename without extension', () => {
      expect(deriveTitle('filename')).toBe('filename');
    });

    it('handles multiple dots', () => {
      expect(deriveTitle('my.special.file.txt')).toBe('my.special.file');
    });
  });
});
