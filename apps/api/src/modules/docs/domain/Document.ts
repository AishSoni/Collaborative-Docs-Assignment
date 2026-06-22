export interface Document {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
