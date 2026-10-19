import { z } from 'zod';
import type { RentalItemsConfig } from '@duncit/utils';
import type { Translate } from './translate';

/**
 * A venue's rented items — shared by the MUI desk (@duncit/venue-rentals) and
 * the app's Tamagui desk. The caps are venueRegistrationConfig's (the server's
 * own VENUE_RENTAL_LIMITS), so the form refuses exactly what the server would.
 * Numbers arrive from text fields, so they are coerced and kept whole.
 */
const whole = (t: Translate, min: number, max: number) => {
  const message = t('venueRentals.items.wholeInvalid', { vars: { min, max } });
  return z.coerce.number({ error: message }).int(message).min(min, message).max(max, message);
};

/**
 * The Super → Category → Sub rows an item is offered under: at least one, each
 * picked all the way down to its sub, never the same sub twice. The chain
 * itself (a sub under its category) is the picker's and the server's job.
 */
const categoryRows = (t: Translate, max: number) =>
  z
    .array(
      z.object({
        super_id: z.string().min(1, t('venueRentals.items.categoryIncomplete')),
        super_name: z.string(),
        category_id: z.string().min(1, t('venueRentals.items.categoryIncomplete')),
        category_name: z.string(),
        sub_id: z.string().min(1, t('venueRentals.items.categoryIncomplete')),
        sub_name: z.string(),
      })
    )
    .min(1, t('venueRentals.items.categoryRequired'))
    .max(max, t('venueRentals.items.categoriesMax', { vars: { max } }))
    .refine((rows) => new Set(rows.map((row) => row.sub_id)).size === rows.length, {
      message: t('venueRentals.items.categoryDuplicate'),
    });

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
      categories: categoryRows(t, config.rental_category_limit),
    })
    .refine((value) => value.per_guest_limit <= value.stock, {
      path: ['per_guest_limit'],
      message: t('venueRentals.items.perGuestOverStock'),
    });
  return z.object({
    offers_rentals: z.boolean(),
    rental_terms_html: z.string().max(config.rental_terms_max, t('venueRentals.items.termsTooLong', { vars: { max: config.rental_terms_max } })),
    items: z.array(item).max(config.rental_item_limit, t('venueRentals.items.tooManyItems', { vars: { max: config.rental_item_limit } })),
  });
}

export type RentalItemsOutput = z.infer<ReturnType<typeof makeRentalItemsSchema>>;
