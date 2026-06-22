import { DocumentRepository } from '../infra/DocumentRepository.js';

const DEFAULT_CONTENT = { type: 'doc', content: [] };

export async function CreateDoc(data: {
  ownerId: string;
  title?: string;
  content?: unknown;
}) {
  return DocumentRepository.insert({
    title: data.title || 'Untitled',
    content: data.content || DEFAULT_CONTENT,
    ownerId: data.ownerId,
  });
}
