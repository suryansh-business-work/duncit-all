import { z } from 'zod';
import { NEARBY_RADIUS } from '../../hooks/useNearbyLeads';
import type { Translate } from './nearby-leads.types';

/** A Nearby leads search: around my position, or around a picked city (and area), within a radius the server accepts. */
export const nearbyLeadsSchema = (t: Translate) => {
  const radiusMessage = t('crm.nearby.radiusRange', { vars: { min: NEARBY_RADIUS.min, max: NEARBY_RADIUS.max } });
  return z
    .object({
      source: z.enum(['me', 'place']),
      city: z.string().trim(),
      area: z.string().trim(),
      radius_km: z.number().min(NEARBY_RADIUS.min, radiusMessage).max(NEARBY_RADIUS.max, radiusMessage),
    })
    .superRefine((value, ctx) => {
      if (value.source === 'place' && !value.city) {
        ctx.addIssue({ code: 'custom', path: ['city'], message: t('crm.nearby.cityRequired') });
      }
    });
};

export type NearbyLeadsFormValues = z.infer<ReturnType<typeof nearbyLeadsSchema>>;

export const nearbyLeadsDefaults: NearbyLeadsFormValues = {
  source: 'me',
  city: '',
  area: '',
  radius_km: NEARBY_RADIUS.initial,
};
