import { z } from 'zod';

import type { Translate } from './translate';

/** Bounds and presets of a Nearby leads radius (km). The server refuses anything outside min…max. */
export const NEARBY_RADIUS = { min: 0.5, max: 50, initial: 5, step: 0.5, marks: [1, 2, 5, 10, 25, 50] } as const;

/**
 * A Nearby leads search on a CRM lead listing: around my position, or around a
 * picked city (and area), within a radius the server accepts. Shared by the
 * CRM portal and the Duncit CRM app.
 */
export const makeNearbyLeadsSchema = (t: Translate) => {
  const radiusMessage = t('crm.nearby.radiusRange', { vars: { min: NEARBY_RADIUS.min, max: NEARBY_RADIUS.max } });
  return z
    .object({
      source: z.enum(['me', 'place']),
      city: z.string().trim(),
      area: z.string().trim(),
      radius_km: z
        .number({ message: radiusMessage })
        .min(NEARBY_RADIUS.min, radiusMessage)
        .max(NEARBY_RADIUS.max, radiusMessage),
    })
    .superRefine((value, ctx) => {
      if (value.source === 'place' && !value.city) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: t('crm.nearby.cityRequired') });
      }
    });
};

export type NearbyLeadsValues = z.infer<ReturnType<typeof makeNearbyLeadsSchema>>;

export const nearbyLeadsDefaults: NearbyLeadsValues = {
  source: 'me',
  city: '',
  area: '',
  radius_km: NEARBY_RADIUS.initial,
};
