import { z } from 'zod';
import { URL_SLUG } from '@duncit/regex';
import type { Translate } from '@duncit/shell';
import { BANNER_STYLES, PRICE_FILTERS, SETTINGS_LIMITS } from '../copy';
import type { PickOption, PodPromoSettings, PodPromoSettingsInput } from '../queries';

export type PromoSettingsFormValues = PodPromoSettingsInput;

/** What the settings pickers choose from. */
export interface PromoSettingsOptions {
  accounts: PickOption[];
  cities: PickOption[];
  clubs: PickOption[];
  categories: PickOption[];
}

export interface PromoSettingsFormProps {
  settings: PodPromoSettings;
  options: PromoSettingsOptions;
  /** An editor reads the settings; only a manager may change them. */
  readOnly: boolean;
  busy: boolean;
  onSubmit: (values: PromoSettingsFormValues) => Promise<void>;
}

/** The saved settings as the form edits them — the server's read-only fields left out. */
export const toFormValues = (settings: PodPromoSettings): PromoSettingsFormValues => ({
  enabled: settings.enabled,
  days_before: settings.days_before,
  post_hour: settings.post_hour,
  account_ids: [...settings.account_ids],
  needs_approval: settings.needs_approval,
  city_ids: [...settings.city_ids],
  club_ids: [...settings.club_ids],
  category_ids: [...settings.category_ids],
  price_filter: settings.price_filter,
  min_days_until_start: settings.min_days_until_start,
  banner_style: settings.banner_style,
  cta_text: settings.cta_text,
  utm_prefix: settings.utm_prefix,
});

const whole = (t: Translate, { min, max }: { min: number; max: number }) =>
  z.coerce
    .number()
    .int(t('marketing.podPromo.wholeNumber'))
    .min(min, t('marketing.podPromo.numberRange', { vars: { min, max } }))
    .max(max, t('marketing.podPromo.numberRange', { vars: { min, max } }));

export const promoSettingsSchema = (t: Translate) =>
  z
    .object({
      enabled: z.boolean(),
      days_before: whole(t, SETTINGS_LIMITS.days_before),
      post_hour: whole(t, SETTINGS_LIMITS.post_hour),
      account_ids: z.array(z.string()),
      needs_approval: z.boolean(),
      city_ids: z.array(z.string()),
      club_ids: z.array(z.string()),
      category_ids: z.array(z.string()),
      price_filter: z.enum(PRICE_FILTERS),
      min_days_until_start: whole(t, SETTINGS_LIMITS.min_days_until_start),
      banner_style: z.enum(BANNER_STYLES),
      cta_text: z
        .string()
        .trim()
        .max(SETTINGS_LIMITS.cta_text.max, t('marketing.podPromo.tooLong', { vars: { max: SETTINGS_LIMITS.cta_text.max } })),
      utm_prefix: z
        .string()
        .trim()
        .min(1, t('marketing.podPromo.utmPrefixRequired'))
        .max(SETTINGS_LIMITS.utm_prefix.max, t('marketing.podPromo.tooLong', { vars: { max: SETTINGS_LIMITS.utm_prefix.max } }))
        .regex(URL_SLUG, t('marketing.podPromo.utmPrefixShape')),
    })
    // Switched on with nowhere to post, every pod would fail at its first step.
    .refine((values) => !values.enabled || values.account_ids.length > 0, {
      path: ['account_ids'],
      message: t('marketing.podPromo.accountsRequired'),
    });
