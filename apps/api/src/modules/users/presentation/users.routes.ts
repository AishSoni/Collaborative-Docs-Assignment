import { Hono } from 'hono';
import { currentUserMiddleware } from '../../../middleware/current-user.js';
import { GetCurrentUser } from '../application/GetCurrentUser.js';
import { ListUsers } from '../application/ListUsers.js';

const users = new Hono();

users.get('/users/me', currentUserMiddleware, async (c) => {
  const user = c.var.user;
  return c.json(user);
});

users.get('/users', async (c) => {
  const users = await ListUsers();
  return c.json(users);
});

export { users };
