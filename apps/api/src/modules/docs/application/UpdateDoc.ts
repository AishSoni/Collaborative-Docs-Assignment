import { NotFoundError } from 'shared';
import { DocumentRepository } from '../infra/DocumentRepository.js';
import { ShareRepository } from '../../shares/infra/ShareRepository.js';
import { assertCanWrite } from '../domain/authorization.js';
import { applyUpdate } from '../domain/merge.js';
import { sanitize } from '../../content/sanitize.js';
import type { TiptapDoc } from '../../content/tiptap-types.js';

export async function UpdateDoc(
  docId: string,
  userId: string,
  patch: { title?: string; content?: unknown; version: number }
) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  const shares = await ShareRepository.findForDoc(docId);
  assertCanWrite(doc, userId, shares);

  const result = applyUpdate(doc, patch, patch.version);
  if (!result.ok) {
    return result;
  }

  const updatedDoc = result.value;
  let sanitizedContent = updatedDoc.content;
  if (patch.content !== undefined) {
    sanitizedContent = sanitize(patch.content as TiptapDoc);
  }

  const persisted = await DocumentRepository.update(
    docId,
    { title: updatedDoc.title, content: sanitizedContent },
    patch.version
  );

  return { ok: true as const, value: persisted };
}
