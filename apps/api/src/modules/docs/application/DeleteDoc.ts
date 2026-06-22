import { NotFoundError } from 'shared';
import { DocumentRepository } from '../infra/DocumentRepository.js';
import { assertCanManage } from '../domain/authorization.js';

export async function DeleteDoc(docId: string, userId: string) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  assertCanManage(doc, userId);
  await DocumentRepository.delete(docId);
}
