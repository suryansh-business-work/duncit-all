import { z } from 'zod';
import type { SliderForm } from '../queries';

const isHttpUrl = (value: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

export const sliderFormSchema: z.ZodType<SliderForm, z.ZodTypeDef, unknown> = z
  .object({
    id: z.string().optional(),
    slider_id: z.string().trim().max(80, 'Slider ID must be 80 characters or fewer').default(''),
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .min(2, 'Title must be at least 2 characters')
      .max(120, 'Title must be 120 characters or fewer'),
    description: z.string().trim().max(1000, 'Description must be 1000 characters or fewer').default(''),
    media_url: z.string().trim().min(1, 'Media URL is required'),
    media_type: z.enum(['IMAGE', 'VIDEO']),
    link_type: z.enum(['INTERNAL', 'EXTERNAL']),
    link_target_kind: z.enum(['POD', 'CLUB', '']).default(''),
    link_target_id: z.string().trim().default(''),
    link_url: z.string().trim().default('').refine(isHttpUrl, 'External link must be a valid http(s) URL'),
    scope: z.enum(['GLOBAL', 'LOCATION', 'ZONE']),
    super_category_slug: z.string().trim().default(''),
    location_id: z.string().default(''),
    zone_name: z.string().default(''),
    sort_order: z.coerce
      .number()
      .int('Sort order must be a whole number')
      .min(0, 'Sort order must be 0 or greater')
      .max(9999),
    starts_at: z.string().default(''),
    ends_at: z.string().default(''),
    is_active: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.link_type === 'INTERNAL') {
      if (values.link_target_kind !== 'POD' && values.link_target_kind !== 'CLUB') {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['link_target_kind'], message: 'Pick a target kind' });
      }
      if (!values.link_target_id) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['link_target_id'], message: 'Pick a pod or club' });
      }
    }
    if (values.link_type === 'EXTERNAL' && !(values.link_url && values.link_url.trim().length > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['link_url'], message: 'External URL is required' });
    }
    if ((values.scope === 'LOCATION' || values.scope === 'ZONE') && !values.location_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['location_id'], message: 'Pick a location' });
    }
    if (values.scope === 'ZONE' && !values.zone_name) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['zone_name'], message: 'Pick a zone' });
    }
    if (values.ends_at && values.starts_at && new Date(values.ends_at) <= new Date(values.starts_at)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['ends_at'], message: 'End must be after start' });
    }
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
  const cast = sliderFormSchema.parse(values);
  return {
    slider_id: cast.slider_id || undefined,
    title: cast.title,
    description: cast.description,
    media_url: cast.media_url,
    media_type: cast.media_type,
    link_type: cast.link_type,
    link_target_kind:
      cast.link_type === 'INTERNAL' ? ((cast.link_target_kind || null) as 'POD' | 'CLUB' | null) : null,
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
