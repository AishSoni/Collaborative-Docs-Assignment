import { describe, it, expect } from 'vitest';
import { canRead, canWrite, canManage } from '../../src/modules/docs/domain/authorization.js';
import type { Document } from '../../src/modules/docs/domain/Document.js';
import type { Share } from '../../src/modules/shares/domain/Share.js';

const ownerDoc: Document = {
  id: 'doc1',
  title: 'Test',
  content: { type: 'doc', content: [] },
  ownerId: 'alice',
  version: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const shares: Share[] = [
  { id: 's1', documentId: 'doc1', granteeId: 'bob', role: 'EDITOR', createdAt: new Date() },
];

describe('authorization', () => {
  describe('canRead', () => {
    it('allows owner', () => {
      expect(canRead(ownerDoc, 'alice', shares)).toBe(true);
    });

    it('allows grantee', () => {
      expect(canRead(ownerDoc, 'bob', shares)).toBe(true);
    });

    it('rejects stranger', () => {
      expect(canRead(ownerDoc, 'carol', shares)).toBe(false);
    });
  });

  describe('canWrite', () => {
    it('allows owner', () => {
      expect(canWrite(ownerDoc, 'alice', shares)).toBe(true);
    });

    it('allows editor grantee', () => {
      expect(canWrite(ownerDoc, 'bob', shares)).toBe(true);
    });

    it('rejects stranger', () => {
      expect(canWrite(ownerDoc, 'carol', shares)).toBe(false);
    });
  });

  describe('canManage', () => {
    it('allows owner', () => {
      expect(canManage(ownerDoc, 'alice')).toBe(true);
    });

    it('rejects grantee', () => {
      expect(canManage(ownerDoc, 'bob')).toBe(false);
    });

    it('rejects stranger', () => {
      expect(canManage(ownerDoc, 'carol')).toBe(false);
    });
  });
});
