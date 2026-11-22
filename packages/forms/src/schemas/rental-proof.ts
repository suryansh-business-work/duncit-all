import { z } from 'zod';
import { RENTAL_PROOF_IMAGES_MAX, RENTAL_PROOF_NOTE_MAX } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * Optional proof on a rental: a note, photos uploaded through Duncit, or both
 * (never neither). The limits are the server's own (rentalBooking.model.ts) and
 * the server checks every rule again; Razorpay's record, not a proof, is what
 * shows a refund happened.
 */
export function makeRentalProofSchema(t: Translate) {
  return z
    .object({
      note: z
        .string()
        .trim()
        .max(RENTAL_PROOF_NOTE_MAX, t('venueRentals.proof.noteTooLong', { vars: { max: RENTAL_PROOF_NOTE_MAX } })),
      image_urls: z
        .array(z.string().trim().min(1))
        .max(RENTAL_PROOF_IMAGES_MAX, t('venueRentals.proof.tooManyPhotos', { vars: { max: RENTAL_PROOF_IMAGES_MAX } })),
    })
    .superRefine((value, ctx) => {
      if (value.note || value.image_urls.length > 0) return;
      ctx.addIssue({ code: 'custom', path: ['note'], message: t('venueRentals.proof.required') });
    });
}

export interface RentalProofFormValues {
  note: string;
  image_urls: string[];
}

export type RentalProofOutput = z.infer<ReturnType<typeof makeRentalProofSchema>>;
