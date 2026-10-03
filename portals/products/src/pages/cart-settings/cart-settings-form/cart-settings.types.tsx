import { z } from 'zod';
import { CART_SETTINGS_BOUNDS } from '@duncit/utils';
import type { useTranslation } from '@duncit/shell';

type Translate = ReturnType<typeof useTranslation>['t'];
type BoundedKey = keyof typeof CART_SETTINGS_BOUNDS;

export interface ProductCartSettings {
  nudge_enabled: boolean;
  nudge_delay_minutes: number;
  nudge_auto_hide_seconds: number;
  email_enabled: boolean;
  email_first_delay_hours: number;
  email_repeat_hours: number;
  email_max_count: number;
  updated_at?: string | null;
}

/**
 * Numbers are held as STRINGS so an emptied field stays empty instead of
 * collapsing to 0 — every bound here starts at 1, so 0 would be a silent
 * clamp rather than what the person typed.
 */
const bounded = (t: Translate, key: BoundedKey) => {
  const { min, max } = CART_SETTINGS_BOUNDS[key];
  return z
    .string()
    .trim()
    .refine((value) => {
      const n = Number(value);
      return value !== '' && Number.isInteger(n) && n >= min && n <= max;
    }, t('products.cartSettings.range', { vars: { min, max } }));
};

export const cartSettingsSchema = (t: Translate) =>
  z.object({
    nudge_enabled: z.boolean(),
    nudge_delay_minutes: bounded(t, 'nudge_delay_minutes'),
    nudge_auto_hide_seconds: bounded(t, 'nudge_auto_hide_seconds'),
    email_enabled: z.boolean(),
    email_first_delay_hours: bounded(t, 'email_first_delay_hours'),
    email_repeat_hours: bounded(t, 'email_repeat_hours'),
    email_max_count: bounded(t, 'email_max_count'),
  });

export type CartSettingsFormValues = z.infer<ReturnType<typeof cartSettingsSchema>>;

export type CartSettingsNumberField = Exclude<
  keyof CartSettingsFormValues,
  'nudge_enabled' | 'email_enabled'
>;

/** Server payload -> form values. */
export function toCartSettingsForm(settings: ProductCartSettings): CartSettingsFormValues {
  return {
    nudge_enabled: settings.nudge_enabled,
    nudge_delay_minutes: String(settings.nudge_delay_minutes),
    nudge_auto_hide_seconds: String(settings.nudge_auto_hide_seconds),
    email_enabled: settings.email_enabled,
    email_first_delay_hours: String(settings.email_first_delay_hours),
    email_repeat_hours: String(settings.email_repeat_hours),
    email_max_count: String(settings.email_max_count),
  };
}

/** Form values -> `UpdateProductCartSettingsInput`. */
export function toCartSettingsInput(values: CartSettingsFormValues) {
  return {
    nudge_enabled: values.nudge_enabled,
    nudge_delay_minutes: Number(values.nudge_delay_minutes),
    nudge_auto_hide_seconds: Number(values.nudge_auto_hide_seconds),
    email_enabled: values.email_enabled,
    email_first_delay_hours: Number(values.email_first_delay_hours),
    email_repeat_hours: Number(values.email_repeat_hours),
    email_max_count: Number(values.email_max_count),
  };
}
