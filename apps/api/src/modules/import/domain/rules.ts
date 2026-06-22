import { PayloadTooLargeError, UnsupportedMediaError } from 'shared';
import { ok, err } from 'shared';
import type { Result } from 'shared';

export const MAX_UPLOAD_BYTES = 2_000_000;
export const ALLOWED_EXTENSIONS = ['.md', '.txt', '.docx'];

export type Ext = '.md' | '.txt' | '.docx';

interface UploadMeta {
  filename: string;
  size: number;
}

export function validateUpload(meta: UploadMeta): Result<Ext, PayloadTooLargeError | UnsupportedMediaError> {
  if (meta.size > MAX_UPLOAD_BYTES) {
    return err(new PayloadTooLargeError(`File too large — maximum is ${MAX_UPLOAD_BYTES / 1_000_000}MB`));
  }

  const ext = getExtension(meta.filename);
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return err(
      new UnsupportedMediaError(
        `Unsupported file type — allowed: ${ALLOWED_EXTENSIONS.join(', ')}`
      )
    );
  }

  return ok(ext as Ext);
}

export function deriveTitle(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  return dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
}

function getExtension(filename: string): string | null {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex < 0) return null;
  return filename.substring(dotIndex).toLowerCase();
}
