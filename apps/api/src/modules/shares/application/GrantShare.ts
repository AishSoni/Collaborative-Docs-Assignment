import { NotFoundError } from 'shared';
import { DocumentRepository } from '../../docs/infra/DocumentRepository.js';
import { ShareRepository } from '../infra/ShareRepository.js';
import { assertCanManage } from '../../docs/domain/authorization.js';

export async function GrantShare(
  docId: string,
  ownerId: string,
  granteeId: string,
  role: 'EDITOR' = 'EDITOR'
) {
  const doc = await DocumentRepository.findById(docId);
  if (!doc) {
    throw new NotFoundError('Document not found');
  }

  assertCanManage(doc, ownerId);

  const share = await ShareRepository.upsert({
    documentId: docId,
    granteeId,
    role,
  });

  return share;
}
