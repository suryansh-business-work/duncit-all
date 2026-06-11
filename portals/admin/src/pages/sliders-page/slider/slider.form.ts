import * as yup from 'yup';
import type { SliderForm } from '../queries';

const httpOnlyUrl = yup
  .string()
  .trim()
  .default('')
  .test('http-url', 'External link must be a valid http(s) URL', (value) => {
    if (!value) return true;
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  });

export const sliderFormSchema = yup.object({
  id: yup.string().optional(),
  slider_id: yup
    .string()
    .trim()
    .max(80, 'Slider ID must be 80 characters or fewer')
    .default(''),
  title: yup
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(120, 'Title must be 120 characters or fewer')
    .required('Title is required'),
  description: yup
    .string()
    .trim()
    .max(1000, 'Description must be 1000 characters or fewer')
    .default(''),
  media_url: yup
    .string()
    .trim()
    .required('Media URL is required'),
  media_type: yup
    .mixed<'IMAGE' | 'VIDEO'>()
    .oneOf(['IMAGE', 'VIDEO'])
    .required('Media type is required'),
  link_type: yup
    .mixed<'INTERNAL' | 'EXTERNAL'>()
    .oneOf(['INTERNAL', 'EXTERNAL'])
    .required(),
  link_target_kind: yup
    .mixed<'POD' | 'CLUB' | ''>()
    .oneOf(['POD', 'CLUB', ''])
    .when('link_type', {
      is: 'INTERNAL',
      then: (schema) =>
        schema.test('kind-required', 'Pick a target kind', (value) => value === 'POD' || value === 'CLUB'),
      otherwise: (schema) => schema.default(''),
    }),
  link_target_id: yup.string().trim().default('').when('link_type', {
    is: 'INTERNAL',
    then: (schema) => schema.required('Pick a pod or club'),
  }),
  link_url: httpOnlyUrl.when('link_type', {
    is: 'EXTERNAL',
    then: (schema) =>
      schema.test(
        'external-required',
        'External URL is required',
        (value) => !!(value && value.trim().length > 0),
      ),
  }),
  scope: yup
    .mixed<'GLOBAL' | 'LOCATION' | 'ZONE'>()
    .oneOf(['GLOBAL', 'LOCATION', 'ZONE'])
    .required('Scope is required'),
  super_category_slug: yup.string().trim().default(''),
  location_id: yup.string().default('').when('scope', {
    is: (scope: string) => scope === 'LOCATION' || scope === 'ZONE',
    then: (schema) => schema.required('Pick a location'),
  }),
  zone_name: yup.string().default('').when('scope', {
    is: 'ZONE',
    then: (schema) => schema.required('Pick a zone'),
  }),
  sort_order: yup
    .number()
    .integer('Sort order must be a whole number')
    .min(0, 'Sort order must be 0 or greater')
    .max(9999)
    .required('Sort order is required'),
  starts_at: yup.string().default(''),
  ends_at: yup
    .string()
    .default('')
    .test('after-start', 'End must be after start', function endAfterStart(value) {
      const { starts_at } = this.parent;
      if (!value || !starts_at) return true;
      return new Date(value) > new Date(starts_at);
    }),
  is_active: yup.boolean().required(),
});

export interface CreateSliderInput {
  slider_id?: string;
  title: string;
  description: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  link_type: 'INTERNAL' | 'EXTERNAL';
  link_target_kind: 'POD' | 'CLUB' | null;
  link_target_id: string | null;
  link_url: string;
  scope: 'GLOBAL' | 'LOCATION' | 'ZONE';
  super_category_slug: string | null;
  location_id: string | null;
  zone_name: string | null;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
}

export function toCreateSliderInput(values: SliderForm): CreateSliderInput {
  const cast = sliderFormSchema.cast(values, { stripUnknown: true });
  return {
    slider_id: cast.slider_id || undefined,
    title: cast.title,
    description: cast.description,
    media_url: cast.media_url,
    media_type: cast.media_type,
    link_type: cast.link_type,
    link_target_kind: cast.link_type === 'INTERNAL' ? (cast.link_target_kind || null) as any : null,
    link_target_id: cast.link_type === 'INTERNAL' ? cast.link_target_id : null,
    link_url: cast.link_type === 'EXTERNAL' ? cast.link_url : '',
    scope: cast.scope,
    super_category_slug: cast.super_category_slug || null,
    location_id: cast.scope === 'GLOBAL' ? null : cast.location_id,
    zone_name: cast.scope === 'ZONE' ? cast.zone_name : null,
    sort_order: Number(cast.sort_order) || 0,
    starts_at: cast.starts_at ? new Date(cast.starts_at).toISOString() : null,
    ends_at: cast.ends_at ? new Date(cast.ends_at).toISOString() : null,
  };
}

export function toUpdateSliderInput(values: SliderForm) {
  const base = toCreateSliderInput(values);
  // Update doesn't accept slider_id
  const { slider_id: _omit, ...input } = base;
  return { ...input, is_active: values.is_active };
}
