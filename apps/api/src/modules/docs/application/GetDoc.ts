import { NotFoundError } from 'shared';
import { DocumentRepository } from '../infra/DocumentRepository.js';
import { ShareRepository } from '../../shares/infra/ShareRepository.js';
import { assertCanRead } from '../domain/authorization.js';

export async function GetDoc(docId: string, userId: string) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  const shares = await ShareRepository.findForDoc(docId);
  assertCanRead(doc, userId, shares);

  return { doc, shares };
}
