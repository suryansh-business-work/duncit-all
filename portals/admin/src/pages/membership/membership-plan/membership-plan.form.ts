import { z } from 'zod';
import { SLUG_KEY_PATTERN } from '@duncit/forms';

/** A 3- or 6-digit hex colour, or blank to fall back to the app's primary. */
const HEX_COLOR_PATTERN = /^#(?:[\da-fA-F]{3}|[\da-fA-F]{6})$/;

export interface MembershipPlanFormValues {
  key: string;
  name: string;
  tagline: string;
  price_label: string;
  price_note: string;
  badge_label: string;
  accent_color: string;
  cta_label: string;
  sort_order: number;
  is_active: boolean;
}

export const membershipPlanFormSchema: z.ZodType<MembershipPlanFormValues, z.ZodTypeDef, unknown> =
  z.object({
    key: z
      .string()
      .trim()
      .min(1, 'Key is required')
      .max(40, 'Key must be 40 characters or fewer')
      .regex(SLUG_KEY_PATTERN, 'Key may contain lowercase letters, digits, dashes and underscores'),
    name: z
      .string()
      .trim()
      .min(1, 'Name is required')
      .max(60, 'Name must be 60 characters or fewer'),
    tagline: z.string().trim().max(200, 'Tagline must be 200 characters or fewer').default(''),
    price_label: z.string().trim().max(40, 'Price must be 40 characters or fewer').default(''),
    price_note: z.string().trim().max(80, 'Note must be 80 characters or fewer').default(''),
    badge_label: z.string().trim().max(40, 'Badge must be 40 characters or fewer').default(''),
    accent_color: z
      .string()
      .trim()
      .default('')
      .refine(
        (value) => !value || HEX_COLOR_PATTERN.test(value),
        'Use a hex colour like #B4532A, or leave blank'
      ),
    cta_label: z.string().trim().max(40, 'Button text must be 40 characters or fewer').default(''),
    sort_order: z.coerce
      .number()
      .int('Sort order must be a whole number')
      .min(0, 'Sort order must be 0 or greater')
      .max(999, 'Sort order must be 999 or fewer'),
    is_active: z.boolean().default(true),
  });

export const membershipPlanFormDefaults: MembershipPlanFormValues = {
  key: '',
  name: '',
  tagline: '',
  price_label: '',
  price_note: '',
  badge_label: '',
  accent_color: '',
  cta_label: '',
  sort_order: 0,
  is_active: true,
};

/** Create payload — carries the key, which an update never may. */
export function toMembershipPlanInput(values: MembershipPlanFormValues) {
  const cast = membershipPlanFormSchema.parse(values);
  return { ...toMembershipPlanUpdateInput(cast), key: cast.key };
}

/**
 * Update payload. The key is deliberately absent: every benefit cell
 * references a plan by key, so renaming one would orphan its whole column.
 */
export function toMembershipPlanUpdateInput(values: MembershipPlanFormValues) {
  const cast = membershipPlanFormSchema.parse(values);
  return {
    name: cast.name,
    tagline: cast.tagline,
    price_label: cast.price_label,
    price_note: cast.price_note,
    badge_label: cast.badge_label,
    accent_color: cast.accent_color,
    cta_label: cast.cta_label,
    sort_order: Number(cast.sort_order) || 0,
    is_active: cast.is_active,
  };
}
