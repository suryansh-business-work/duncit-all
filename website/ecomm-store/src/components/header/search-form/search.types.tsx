import { z } from 'zod';

export const searchSchema = z.object({
  q: z.string().trim().max(120),
});

export type SearchValues = z.infer<typeof searchSchema>;

/** One row of the type-ahead list: a product, an aisle, a brand, or "search for …". */
export type SuggestOption =
  | { kind: 'product'; id: string; label: string; to: string; image: string }
  | { kind: 'category'; id: string; label: string; to: string }
  | { kind: 'brand'; id: string; label: string; to: string }
  | { kind: 'query'; id: string; label: string; to: string };
