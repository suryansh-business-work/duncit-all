import { z } from 'zod';
import { DEFAULT_MIN_WITHDRAWAL, ROLE_MINIMUM_FIELD, type MinimumField } from './roles';
import type { WithdrawalMinimums } from './queries';

/** Sanity ceiling: a floor above this is a typo, not a policy. */
export const MAX_MIN_WITHDRAWAL = 1000000;

/**
 * Rupees are held as strings in the form so an empty field stays empty rather
 * than collapsing to 0, and validated as whole rupees — the server stores a
 * plain rupee Number, so paise here would silently round somewhere downstream.
 */
const rupees = z
  .string()
  .trim()
  .min(1, 'Enter a minimum amount.')
  .regex(/^\d+$/, 'Whole rupees only — digits, no decimals or symbols.')
  .refine(
    (value) => Number.parseInt(value, 10) <= MAX_MIN_WITHDRAWAL,
    // No currency symbol: the field already carries the configured one as its
    // adornment, and a literal here would contradict it wherever it is not ₹.
    `Keep the floor at or under ${MAX_MIN_WITHDRAWAL.toLocaleString('en-IN')}.`,
  );

export const withdrawalMinimumsSchema = z.object({
  host: rupees,
  venue_owner: rupees,
  ecomm_manager: rupees,
  club_admin: rupees,
});

export type WithdrawalMinimumsForm = z.infer<typeof withdrawalMinimumsSchema>;

const FIELDS = Object.values(ROLE_MINIMUM_FIELD) as MinimumField[];

/** Every field starts at the server's own default, so a blank load still reads 1000. */
export const BLANK_MINIMUMS: WithdrawalMinimumsForm = {
  host: String(DEFAULT_MIN_WITHDRAWAL),
  venue_owner: String(DEFAULT_MIN_WITHDRAWAL),
  ecomm_manager: String(DEFAULT_MIN_WITHDRAWAL),
  club_admin: String(DEFAULT_MIN_WITHDRAWAL),
};

/** Server payload -> form strings. */
export function toFormValues(minimums: WithdrawalMinimums): WithdrawalMinimumsForm {
  const values = { ...BLANK_MINIMUMS };
  for (const field of FIELDS) {
    values[field] = String(minimums[field] ?? DEFAULT_MIN_WITHDRAWAL);
  }
  return values;
}
