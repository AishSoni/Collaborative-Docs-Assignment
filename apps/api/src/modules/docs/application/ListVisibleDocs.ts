import { DocumentRepository } from '../infra/DocumentRepository.js';

export async function ListVisibleDocs(userId: string) {
  const [owned, shared] = await Promise.all([
    DocumentRepository.findOwnedBy(userId),
    DocumentRepository.findSharedWith(userId),
  ]);

  return { owned, shared };
}
