import { getPrisma } from '../../../infra/db/prisma.js';
import { ConflictError } from 'shared';
import type { Document } from '../domain/Document.js';

function toDocument(row: any): Document {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    ownerId: row.ownerId,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export const DocumentRepository = {
  async findById(id: string): Promise<Document | null> {
    const prisma = getPrisma();
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return null;
    return toDocument(doc);
  },

  async findOwnedBy(ownerId: string): Promise<Document[]> {
    const prisma = getPrisma();
    const docs = await prisma.document.findMany({
      where: { ownerId },
      orderBy: { updatedAt: 'desc' },
    });
    return docs.map(toDocument);
  },

  async findSharedWith(userId: string): Promise<Document[]> {
    const prisma = getPrisma();
    const shares = await prisma.share.findMany({
      where: { granteeId: userId },
      include: { document: true },
      orderBy: { document: { updatedAt: 'desc' } },
    });
    return shares.map((s) => toDocument(s.document));
  },

  async insert(data: {
    title: string;
    content: unknown;
    ownerId: string;
  }): Promise<Document> {
    const prisma = getPrisma();
    const doc = await prisma.document.create({
      data: {
        title: data.title,
        content: data.content as any,
        ownerId: data.ownerId,
      },
    });
    return toDocument(doc);
  },

  async update(
    id: string,
    data: { title?: string; content?: unknown },
    expectedVersion: number
  ): Promise<Document> {
    const prisma = getPrisma();
    try {
      const doc = await prisma.document.update({
        where: { id, version: expectedVersion },
        data: {
          ...(data.title !== undefined && { title: data.title }),
          ...(data.content !== undefined && { content: data.content as any }),
        },
      });
      return toDocument(doc);
    } catch (e: any) {
      if (e.code === 'P2025') {
        throw new ConflictError('Document was edited elsewhere — please refetch');
      }
      throw e;
    }
  },

  async delete(id: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.document.delete({ where: { id } });
  },
};
