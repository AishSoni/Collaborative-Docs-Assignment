import { Hono } from 'hono';
import { currentUserMiddleware } from '../../../middleware/current-user.js';
import { ImportFile } from '../application/ImportFile.js';
import { getConfig } from '../../../config.js';

const imp = new Hono();

imp.post('/import', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const config = getConfig();

  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || !(file instanceof File)) {
    return c.json({ error: 'No file provided' }, 422);
  }

  if (file.size > config.MAX_UPLOAD_BYTES) {
    return c.json({ error: `File too large — maximum is ${config.MAX_UPLOAD_BYTES / 1_000_000}MB` }, 413);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await ImportFile(
    {
      filename: file.name,
      size: file.size,
      content: buffer,
    },
    user.id
  );

  if (!result.ok) {
    return c.json({ error: result.error.message }, result.error.statusCode as any);
  }

  return c.json(result.value, 201);
});

export { imp };
