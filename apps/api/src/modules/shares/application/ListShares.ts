import { NotFoundError } from 'shared';
import { DocumentRepository } from '../../docs/infra/DocumentRepository.js';
import { ShareRepository } from '../infra/ShareRepository.js';
import { assertCanManage } from '../../docs/domain/authorization.js';

export async function ListShares(docId: string, userId: string) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  assertCanManage(doc, userId);
  return ShareRepository.findForDoc(docId);
}
