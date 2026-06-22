import type { Ext } from '../../domain/rules.js';
import { parseMarkdown } from './parseMarkdown.js';
import { parseText } from './parseText.js';
import { parseDocx } from './parseDocx.js';

export async function parseByExtension(ext: Ext, content: Buffer | string): Promise<unknown> {
  switch (ext) {
    case '.md':
      return parseMarkdown(typeof content === 'string' ? content : content.toString('utf-8'));
    case '.txt':
      return parseText(typeof content === 'string' ? content : content.toString('utf-8'));
    case '.docx':
      return parseDocx(content as Buffer);
    default:
      throw new Error(`Unsupported extension: ${ext}`);
  }
}
