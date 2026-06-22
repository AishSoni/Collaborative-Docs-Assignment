import { ConflictError, ValidationError } from 'shared';
import { ok, err } from 'shared';
import type { Result } from 'shared';
import type { Document } from './Document.js';

interface UpdatePatch {
  title?: string;
  content?: unknown;
}

export function applyUpdate(
  doc: Document,
  patch: UpdatePatch,
  expectedVersion: number
): Result<Document, ConflictError | ValidationError> {
  if (expectedVersion !== doc.version) {
    return err(new ConflictError('Document was edited elsewhere — please refetch'));
  }

  let title = doc.title;
  if (patch.title !== undefined) {
    title = patch.title === '' ? 'Untitled' : patch.title;
  }

  const updated: Document = {
    ...doc,
    title,
    content: patch.content !== undefined ? patch.content : doc.content,
    version: doc.version + 1,
    updatedAt: new Date(),
  };

  return ok(updated);
}
