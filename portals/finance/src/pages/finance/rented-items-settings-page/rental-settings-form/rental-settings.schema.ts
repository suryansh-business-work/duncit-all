import { z } from 'zod';
import type { Translate } from '@duncit/shell';

/**
 * Finance > Rented Items > Settings. The bounds are the server's own
 * (rentalSettings.service), so the form refuses exactly what the server would.
 * Numbers arrive from text fields, so they are coerced.
 */
export const RENTAL_SETTINGS_LIMITS = {
  commission: { min: 0, max: 100 },
  cutoffHours: { min: 0, max: 168 },
  autoReleaseDays: { min: 1, max: 60 },
  termsMax: 50_000,
} as const;

const wholeIn = (t: Translate, key: string, range: { min: number; max: number }) => {
  const message = t(key, { vars: { min: range.min, max: range.max } });
  return z.coerce.number({ error: message }).int(message).min(range.min, message).max(range.max, message);
};

export function makeRentalSettingsSchema(t: Translate) {
  const commissionMessage = t('finance.rentedItems.commissionInvalid', {
    vars: RENTAL_SETTINGS_LIMITS.commission,
  });
  return z.object({
    enabled: z.boolean(),
    terms_html: z.string().max(RENTAL_SETTINGS_LIMITS.termsMax, t('finance.rentedItems.termsTooLong')),
    commission_pct: z.coerce
      .number({ error: commissionMessage })
      .min(RENTAL_SETTINGS_LIMITS.commission.min, commissionMessage)
      .max(RENTAL_SETTINGS_LIMITS.commission.max, commissionMessage),
    rent_refundable_on_backout: z.boolean(),
    deposit_refundable: z.boolean(),
    booking_cutoff_hours: wholeIn(t, 'finance.rentedItems.cutoffInvalid', RENTAL_SETTINGS_LIMITS.cutoffHours),
    deposit_auto_release_days: wholeIn(
      t,
      'finance.rentedItems.autoReleaseInvalid',
      RENTAL_SETTINGS_LIMITS.autoReleaseDays
    ),
  });
}

export type RentalSettingsOutput = z.infer<ReturnType<typeof makeRentalSettingsSchema>>;

export interface RentalSettingsValues {
  enabled: boolean;
  terms_html: string;
  commission_pct: number | string;
  rent_refundable_on_backout: boolean;
  deposit_refundable: boolean;
  booking_cutoff_hours: number | string;
  deposit_auto_release_days: number | string;
}
