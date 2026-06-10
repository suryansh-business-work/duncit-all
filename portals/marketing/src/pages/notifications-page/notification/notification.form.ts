import * as yup from 'yup';
import { validationRules } from '../../../forms/validation/rules';
import type { NotifForm, NotifScope } from '../helpers';

const scopes: NotifScope[] = ['GLOBAL', 'LOCATION', 'ZONE', 'USER'];

export const notificationFormSchema: yup.ObjectSchema<NotifForm> = yup.object({
  title: validationRules.requiredText('Title', 3, 120),
  body: validationRules.requiredText('Body', 5, 1000),
  image_url: validationRules.optionalUrl('Image URL'),
  link_url: validationRules.optionalUrl('Link URL', true),
  scope: yup.mixed<NotifScope>().oneOf(scopes).required('Audience is required'),
  silent: yup.boolean().required(),
  location_id: yup.string().default('').when('scope', {
    is: (scope: NotifScope) => scope === 'LOCATION' || scope === 'ZONE',
    then: (schema) => schema.required('Pick a location'),
  }),
  zone_name: yup.string().default('').when('scope', {
    is: 'ZONE',
    then: (schema) => schema.required('Pick a zone'),
  }),
  target_user_ids: yup.array(yup.string().required()).default([]).when('scope', {
    is: 'USER',
    then: (schema) => schema.min(1, 'Pick at least one user'),
    otherwise: (schema) => schema.max(0),
  }),
});

export function toCreateNotificationInput(values: NotifForm) {
  const cast = notificationFormSchema.cast(values, { stripUnknown: true });
  return {
    title: cast.title,
    body: cast.body,
    image_url: cast.image_url || null,
    link_url: cast.link_url || null,
    scope: cast.scope,
    silent: cast.silent,
    location_id: cast.scope === 'LOCATION' || cast.scope === 'ZONE' ? cast.location_id : null,
    zone_name: cast.scope === 'ZONE' ? cast.zone_name : null,
    target_user_ids: cast.scope === 'USER' ? cast.target_user_ids : [],
  };
}
