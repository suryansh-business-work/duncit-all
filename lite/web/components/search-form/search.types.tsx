import { z } from 'zod';
import { rules, type Translate } from '../../lib/validation';

/** What the reader is looking for: a word or two, never a paragraph. */
export const makeSearchSchema = (t: Translate) => z.object({ q: rules.optional(t, 120) });

export type SearchValues = z.infer<ReturnType<typeof makeSearchSchema>>;
