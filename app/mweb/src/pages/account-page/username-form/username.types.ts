import { z } from 'zod';
import { USERNAME_PATTERN, normalizeUsername } from '@duncit/utils';

/**
 * The one field, and the only shape the Save button will submit.
 *
 * The pattern is the shared one — the same string the server re-checks in
 * `username.ts` — so the field cannot accept a handle the mutation would then
 * refuse. The message is deliberately absent here: the section renders the
 * status line from `buildUsernameLabels`, which localizes it (rule 38), and a
 * second English copy inside the schema is the one that would drift.
 */
export const usernameFormSchema = z.object({
  username: z
    .string()
    .transform(normalizeUsername)
    .refine((value) => USERNAME_PATTERN.test(value)),
});

export type UsernameFormValues = { username: string };
