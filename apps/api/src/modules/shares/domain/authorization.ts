import { ValidationError } from 'shared';
import type { Document } from '../../docs/domain/Document.js';

export function canGrant(doc: Document, userId: string): boolean {
  return doc.ownerId === userId;
}

export function assertNotSelfShare(doc: Document, granteeId: string): void {
  if (granteeId === doc.ownerId) {
    throw new ValidationError('Cannot share a document with yourself');
  }
}
