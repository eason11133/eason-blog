import { z } from 'astro/zod';

const requiredText = z.string().trim().min(1, '請填入內容');
const optionalDate = z.preprocess(value => value === '' || value === null ? undefined : value, z.coerce.date().optional());

// Works are separate from blog posts: no mandatory category or tags.
// Keep optional legacy categories so already created work files still build.
export const workFrontmatterSchema = z.object({
  title: requiredText,
  date: z.coerce.date(),
  updated: optionalDate,
  description: z.string().optional(),
  draft: z.boolean().optional().default(false),
  pinned: z.boolean().optional().default(false),
  categories: z.array(requiredText).optional().default([]),
  tags: z.array(requiredText).optional().default([]),
}).strict().transform((data) => ({
  ...data,
  pubDate: data.date,
  updatedDate: data.updated,
}));
