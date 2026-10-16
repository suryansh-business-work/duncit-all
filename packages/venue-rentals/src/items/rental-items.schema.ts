import { z } from 'zod';
import type { RentalItemsConfig } from '@duncit/utils';
import type { Translate } from '../types';

/**
 * A venue's rented items. The caps are venueRegistrationConfig's (the server's
 * own VENUE_RENTAL_LIMITS), so the form refuses exactly what the server would.
 * Numbers arrive from text fields, so they are coerced and kept whole.
 */
const whole = (t: Translate, min: number, max: number) => {
  const message = t('venueRentals.items.wholeInvalid', { vars: { min, max } });
  return z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);
};

export function makeRentalItemsSchema(t: Translate, config: RentalItemsConfig) {
  const item = z
    .object({
      id: z.string().nullable(),
      name: z.string().trim().min(1, t('venueRentals.items.nameRequired')).max(80, t('venueRentals.items.nameTooLong')),
      description: z.string().trim().max(500, t('venueRentals.items.descriptionTooLong')),
      images: z.array(z.string()).max(config.rental_image_limit, t('venueRentals.items.tooManyPhotos', { vars: { max: config.rental_image_limit } })),
      unit: z.enum(['SLOT', 'HOUR']),
      rate: whole(t, 1, config.rental_rate_max),
      deposit: whole(t, 0, config.rental_deposit_max),
      stock: whole(t, 1, config.rental_stock_max),
      per_guest_limit: whole(t, 1, config.rental_per_guest_max),
      is_available: z.boolean(),
    })
    .refine((value) => value.per_guest_limit <= value.stock, {
      path: ['per_guest_limit'],
      message: t('venueRentals.items.perGuestOverStock'),
    });
  return z.object({
    offers_rentals: z.boolean(),
    items: z.array(item).max(config.rental_item_limit, t('venueRentals.items.tooManyItems', { vars: { max: config.rental_item_limit } })),
  });
}

export type RentalItemsOutput = z.infer<ReturnType<typeof makeRentalItemsSchema>>;
