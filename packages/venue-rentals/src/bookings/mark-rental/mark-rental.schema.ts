import { z } from 'zod';
import type { Translate } from '../../types';

/**
 * The venue's mark on a rental. The server enforces the same rules
 * (rentalLifecycle.service); the form says them before the round trip. A
 * damage claim is paid out of the deposit, so it can be at most the deposit.
 */
export function makeMarkRentalSchema(t: Translate, maxClaim: number) {
  return z
    .object({
      outcome: z.enum(['RETURNED', 'DAMAGED']),
      damage_claim: z.union([z.number(), z.string()]),
      note: z.string().trim().max(500),
    })
    .superRefine((value, ctx) => {
      if (value.outcome !== 'DAMAGED') return;
      const claim = Number(value.damage_claim);
      if (!Number.isFinite(claim) || claim <= 0 || claim > maxClaim) {
        ctx.addIssue({
          code: 'custom',
          path: ['damage_claim'],
          message: t('venueRentals.mark.claimInvalid', { vars: { max: maxClaim } }),
        });
      }
      if (!value.note) ctx.addIssue({ code: 'custom', path: ['note'], message: t('venueRentals.mark.noteRequired') });
    });
}

export interface MarkRentalValues {
  outcome: 'RETURNED' | 'DAMAGED';
  damage_claim: number | string;
  note: string;
}

export type MarkRentalOutput = z.infer<ReturnType<typeof makeMarkRentalSchema>>;
