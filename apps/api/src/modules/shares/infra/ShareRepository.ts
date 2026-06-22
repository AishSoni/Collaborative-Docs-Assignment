import { getPrisma } from '../../../infra/db/prisma.js';
import type { Share } from '../domain/Share.js';

function toShare(row: any): Share {
  return {
    id: row.id,
    documentId: row.documentId,
    granteeId: row.granteeId,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export const ShareRepository = {
  async findGrantedTo(userId: string): Promise<Share[]> {
    const prisma = getPrisma();
    const shares = await prisma.share.findMany({
      where: { granteeId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map(toShare);
  },

  async findForDoc(docId: string): Promise<Share[]> {
    const prisma = getPrisma();
    const shares = await prisma.share.findMany({
      where: { documentId: docId },
      orderBy: { createdAt: 'desc' },
    });
    return shares.map(toShare);
  },

  async upsert(data: {
    documentId: string;
    granteeId: string;
    role: 'EDITOR';
  }): Promise<Share> {
    const prisma = getPrisma();
    const share = await prisma.share.upsert({
      where: {
        documentId_granteeId: {
          documentId: data.documentId,
          granteeId: data.granteeId,
        },
      },
      update: { role: data.role },
      create: {
        documentId: data.documentId,
        granteeId: data.granteeId,
        role: data.role,
      },
    });
    return toShare(share);
  },

  async delete(docId: string, userId: string): Promise<void> {
    const prisma = getPrisma();
    await prisma.share.deleteMany({
      where: { documentId: docId, granteeId: userId },
    });
  },

  async exists(docId: string, userId: string): Promise<boolean> {
    const prisma = getPrisma();
    const count = await prisma.share.count({
      where: { documentId: docId, granteeId: userId },
    });
    return count > 0;
  },
};
