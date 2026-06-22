import { Hono } from 'hono';
import { CreateDocInputSchema, UpdateDocInputSchema } from 'shared';
import { currentUserMiddleware } from '../../../middleware/current-user.js';
import { CreateDoc } from '../application/CreateDoc.js';
import { GetDoc } from '../application/GetDoc.js';
import { UpdateDoc } from '../application/UpdateDoc.js';
import { DeleteDoc } from '../application/DeleteDoc.js';
import { ListVisibleDocs } from '../application/ListVisibleDocs.js';

const docs = new Hono();

docs.get('/docs', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const result = await ListVisibleDocs(user.id);
  return c.json(result);
});

docs.post('/docs', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const body = await c.req.json();
  const parsed = CreateDocInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.issues }, 422);
  }
  const doc = await CreateDoc({ ownerId: user.id, title: parsed.data.title });
  return c.json(doc, 201);
});

docs.get('/docs/:id', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  const { doc, shares } = await GetDoc(docId, user.id);
  return c.json({ ...doc, shares });
});

docs.patch('/docs/:id', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  const body = await c.req.json();
  const parsed = UpdateDocInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.issues }, 422);
  }
  const result = await UpdateDoc(docId, user.id, parsed.data);
  if (!result.ok) {
    return c.json({ error: result.error.message }, result.error.statusCode as any);
  }
  return c.json(result.value);
});

docs.delete('/docs/:id', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  await DeleteDoc(docId, user.id);
  return c.body(null, 204);
});

export { docs };
