export interface Share {
  id: string;
  documentId: string;
  granteeId: string;
  role: 'EDITOR';
  createdAt: Date;
}

export type Role = 'EDITOR';
