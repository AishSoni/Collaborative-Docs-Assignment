import { NotFoundError } from 'shared';
import { DocumentRepository } from '../../docs/infra/DocumentRepository.js';
import { ShareRepository } from '../infra/ShareRepository.js';
import { assertCanManage } from '../../docs/domain/authorization.js';

export async function RevokeShare(docId: string, ownerId: string, granteeId: string) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  assertCanManage(doc, ownerId);
  await ShareRepository.delete(docId, granteeId);
}
