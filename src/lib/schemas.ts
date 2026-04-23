import { z } from 'zod';

export const vendorSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'id must be kebab-case'),
  name: z.object({
    zh: z.string().min(1),
    en: z.string().min(1),
  }),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'color must be #RRGGBB'),
  website: z.string().url(),
});

export const releaseSchema = z.object({
  date: z.preprocess(
    (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  ),
  vendor: z.string(),
  model: z.string().min(1),
  description: z.object({
    zh: z.string().min(1),
    en: z.string().min(1),
  }),
  link: z.string().url(),
});

export const vendorsFileSchema = z.array(vendorSchema);
export const releasesFileSchema = z.array(releaseSchema);

export type Vendor = z.infer<typeof vendorSchema>;
export type Release = z.infer<typeof releaseSchema>;
