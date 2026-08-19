import { z } from "zod";

export const documentFrontmatterSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).optional(),
    section: z.string().trim().min(1).optional(),
    locale: z.string().trim().min(1).optional(),
    order: z.number().int().optional(),
    draft: z.boolean().optional().default(false),
  })
  .passthrough();

export type DocumentFrontmatter = z.infer<typeof documentFrontmatterSchema>;

export interface DocumentMetadata extends DocumentFrontmatter {
  slug: string;
  sourcePath: string;
}

export interface DocumentRecord {
  markdown: string;
  metadata: DocumentMetadata;
}

export interface LoadDocumentsOptions {
  contentRoot?: string;
  includeDrafts?: boolean;
}
