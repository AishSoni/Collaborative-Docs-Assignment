import { Hono } from 'hono';
import { GrantShareInputSchema } from 'shared';
import { currentUserMiddleware } from '../../../middleware/current-user.js';
import { GrantShare } from '../application/GrantShare.js';
import { RevokeShare } from '../application/RevokeShare.js';
import { ListShares } from '../application/ListShares.js';

const shares = new Hono();

shares.get('/docs/:id/shares', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  const shares = await ListShares(docId, user.id);
  return c.json(shares);
});

shares.post('/docs/:id/shares', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  const body = await c.req.json();
  const parsed = GrantShareInputSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation error', details: parsed.error.issues }, 422);
  }
  const share = await GrantShare(docId, user.id, parsed.data.granteeId, parsed.data.role);
  return c.json(share, 201);
});

shares.delete('/docs/:id/shares/:userId', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  const docId = c.req.param('id') as string;
  const granteeId = c.req.param('userId') as string;
  await RevokeShare(docId, user.id, granteeId);
  return c.body(null, 204);
});

export { shares };
