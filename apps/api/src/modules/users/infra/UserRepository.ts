import { getPrisma } from '../../../infra/db/prisma.js';
import type { User } from '../domain/User.js';

export const UserRepository = {
  async findById(id: string): Promise<User | null> {
    const prisma = getPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      color: user.color,
      createdAt: user.createdAt,
    };
  },

  async findAll(): Promise<User[]> {
    const prisma = getPrisma();
    const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      color: u.color,
      createdAt: u.createdAt,
    }));
  },
};
