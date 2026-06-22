import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  color: z.string(),
  createdAt: z.coerce.date(),
});

export type User = z.infer<typeof UserSchema>;

export const DocumentSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.unknown(),
  ownerId: z.string(),
  version: z.number().int().nonnegative(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type Document = z.infer<typeof DocumentSchema>;

export const ShareSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  granteeId: z.string(),
  role: z.enum(['EDITOR']),
  createdAt: z.coerce.date(),
});

export type Share = z.infer<typeof ShareSchema>;

export const CreateDocInputSchema = z.object({
  title: z.string().optional(),
});

export type CreateDocInput = z.infer<typeof CreateDocInputSchema>;

export const UpdateDocInputSchema = z.object({
  title: z.string().optional(),
  content: z.unknown().optional(),
  version: z.number().int().nonnegative(),
});

export type UpdateDocInput = z.infer<typeof UpdateDocInputSchema>;

export const GrantShareInputSchema = z.object({
  granteeId: z.string(),
  role: z.enum(['EDITOR']).default('EDITOR'),
});

export type GrantShareInput = z.infer<typeof GrantShareInputSchema>;

export const DocsListSchema = z.object({
  owned: z.array(DocumentSchema),
  shared: z.array(DocumentSchema),
});

export type DocsList = z.infer<typeof DocsListSchema>;

export const HealthSchema = z.object({
  ok: z.boolean(),
  db: z.enum(['ok', 'error']),
  seededUsers: z.number(),
  version: z.string(),
});

export type Health = z.infer<typeof HealthSchema>;
