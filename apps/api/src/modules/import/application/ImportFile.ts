import { NotFoundError } from 'shared';
import { validateUpload, deriveTitle } from '../domain/rules.js';
import { parseByExtension } from '../infra/parsers/parseByExtension.js';
import { sanitize } from '../../content/sanitize.js';
import { CreateDoc } from '../../docs/application/CreateDoc.js';
import type { TiptapDoc } from '../../content/tiptap-types.js';

export async function ImportFile(
  file: { filename: string; size: number; content: Buffer },
  userId: string
) {
  const validation = validateUpload({ filename: file.filename, size: file.size });
  if (!validation.ok) {
    return validation;
  }

  const ext = validation.value;
  const title = deriveTitle(file.filename);
  const rawContent = await parseByExtension(ext, file.content);
  const sanitized = sanitize(rawContent as TiptapDoc);

  const doc = await CreateDoc({ ownerId: userId, title, content: sanitized });
  return { ok: true as const, value: doc };
}
