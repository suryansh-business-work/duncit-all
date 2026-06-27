import { z } from 'zod';
import { optionalUrl, requiredText } from '../../../forms/validation/zodRules';
import type { NotifForm } from '../helpers';

const scopes = ['GLOBAL', 'LOCATION', 'ZONE', 'USER'] as const;

/**
 * Notification contract — RHF + Zod (migrated from Formik + Yup).
 * `superRefine` reproduces the old yup `.when('scope')` conditional rules:
 * location is required for LOCATION/ZONE, zone for ZONE, and at least one user
 * for USER (with no users allowed for any other scope).
 */
export const notificationFormSchema = z
  .object({
    title: requiredText('Title', 3, 120),
    body: requiredText('Body', 5, 1000),
    image_url: optionalUrl('Image URL'),
    link_url: optionalUrl('Link URL', true),
    scope: z.enum(scopes, { required_error: 'Audience is required' }),
    silent: z.boolean(),
    location_id: z.string().default(''),
    zone_name: z.string().default(''),
    target_user_ids: z.array(z.string()).default([]),
  })
  .superRefine((values, ctx) => {
    if ((values.scope === 'LOCATION' || values.scope === 'ZONE') && !values.location_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location_id'], message: 'Pick a location' });
    }
    if (values.scope === 'ZONE' && !values.zone_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zone_name'], message: 'Pick a zone' });
    }
    if (values.scope === 'USER') {
      if (values.target_user_ids.length < 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['target_user_ids'], message: 'Pick at least one user' });
      }
    } else if (values.target_user_ids.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        type: 'array',
        maximum: 0,
        inclusive: true,
        path: ['target_user_ids'],
        message: 'target_user_ids must be empty for this audience',
      });
    }
  });

export function toCreateNotificationInput(values: NotifForm) {
  const cast = notificationFormSchema.parse(values);
  const isLocationScoped = cast.scope === 'LOCATION' || cast.scope === 'ZONE';
  return {
    title: cast.title,
    body: cast.body,
    image_url: cast.image_url || null,
    link_url: cast.link_url || null,
    scope: cast.scope,
    silent: cast.silent,
    location_id: isLocationScoped ? cast.location_id : null,
    zone_name: cast.scope === 'ZONE' ? cast.zone_name : null,
    target_user_ids: cast.scope === 'USER' ? cast.target_user_ids : [],
  };
}
