import { ForbiddenError } from 'shared';
import type { Document } from './Document.js';
import type { Share } from '../../shares/domain/Share.js';

export function canRead(doc: Document, userId: string, shares: Share[]): boolean {
  if (doc.ownerId === userId) return true;
  return shares.some((s) => s.documentId === doc.id && s.granteeId === userId);
}

export function canWrite(doc: Document, userId: string, shares: Share[]): boolean {
  if (doc.ownerId === userId) return true;
  return shares.some(
    (s) => s.documentId === doc.id && s.granteeId === userId && s.role === 'EDITOR'
  );
}

export function canManage(doc: Document, userId: string): boolean {
  return doc.ownerId === userId;
}

export function assertCanRead(doc: Document, userId: string, shares: Share[]): void {
  if (!canRead(doc, userId, shares)) {
    throw new ForbiddenError('You do not have read access to this document');
  }
}

export function assertCanWrite(doc: Document, userId: string, shares: Share[]): void {
  if (!canWrite(doc, userId, shares)) {
    throw new ForbiddenError('You do not have write access to this document');
  }
}

export function assertCanManage(doc: Document, userId: string): void {
  if (!canManage(doc, userId)) {
    throw new ForbiddenError('Only the owner can manage this document');
  }
}
