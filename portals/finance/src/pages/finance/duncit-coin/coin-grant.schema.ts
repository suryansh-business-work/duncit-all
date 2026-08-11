import { z } from 'zod';

/** A single adjustment above this is a typo, not a decision. */
export const MAX_ADJUSTMENT = 100000;

export const coinGrantSchema = z.object({
  direction: z.enum(['GRANT', 'DEDUCT']),
  coins: z
    .string()
    .trim()
    .min(1, 'Enter how many coins to apply.')
    .regex(/^\d+$/, 'Whole coins only — digits, no decimals or symbols.')
    .refine((v) => Number.parseInt(v, 10) > 0, 'Zero coins is not an adjustment.')
    .refine(
      (v) => Number.parseInt(v, 10) <= MAX_ADJUSTMENT,
      `Keep a single adjustment at or under ${MAX_ADJUSTMENT.toLocaleString('en-IN')} coins.`,
    ),
  /*
    Required, and not a dropdown of canned options.

    A manual row has no payment and no referral to explain it — these words are
    the entire audit trail, and the person reading them back is someone who was
    not in the room when the decision was made.
  */
  reason: z
    .string()
    .trim()
    .min(4, 'Say why — this is the only explanation the ledger will ever carry.')
    .max(300, 'Keep the reason under 300 characters.'),
});

export type CoinGrantForm = z.infer<typeof coinGrantSchema>;

export const BLANK_GRANT: CoinGrantForm = {
  direction: 'GRANT',
  coins: '',
  reason: '',
};
