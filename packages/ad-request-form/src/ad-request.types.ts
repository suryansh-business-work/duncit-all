import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { optionalText, requiredText } from '@duncit/forms';
import { AD_MEDIA_TYPE_VALUES, AD_POSITION_VALUES, type AdMediaType, type AdPosition } from './ad-options';
import { adRequestT, type Translate } from './i18n/useTranslation';

export type { AdMediaType, AdPosition };

/** Shape sent to the `submitAdRequest` mutation (server SubmitAdRequestInput). */
export interface SubmitAdRequestInput {
  ad_title: string;
  ad_description: string;
  ad_type: AdMediaType;
  media_url: string;
  position: AdPosition;
  start_at: string;
  duration_days: number;
  redirect_url?: string;
  target_audience?: string;
}

const isTodayOrLater = (value: string): boolean => {
  const date = new Date(value);
  // An unparseable value is reported by the previous refine — skip here.
  if (Number.isNaN(date.getTime())) return true;
  return date.getTime() >= startOfDay(new Date()).getTime();
};

const isHttpUrl = (value: string): boolean => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

/**
 * Ad request contract — RHF + Zod. Mirrors the server SubmitAdRequestInput
 * rules.
 *
 * Built from the caller's translator: a validation message is copy the
 * advertiser reads, so it follows their language like every other string on
 * the screen (rule 38). The field NAMES handed to `requiredText`/`optionalText`
 * come from the same catalogue rows the labels do.
 */
export const buildAdRequestSchema = (t: Translate) =>
  z.object({
    ad_title: requiredText(t('adRequest.form.title'), 3, 120),
    ad_description: requiredText(t('adRequest.form.description'), 10, 1000),
    ad_type: z.enum(AD_MEDIA_TYPE_VALUES, { required_error: t('adRequest.errors.typeRequired') }),
    media_url: z.string().trim().min(1, t('adRequest.errors.mediaRequired')),
    position: z.enum(AD_POSITION_VALUES, {
      required_error: t('adRequest.errors.positionRequired'),
    }),
    start_at: z
      .string()
      .trim()
      .min(1, t('adRequest.errors.startRequired'))
      .refine(
        (value) => !Number.isNaN(new Date(value).getTime()),
        t('adRequest.errors.startInvalid'),
      )
      .refine(isTodayOrLater, t('adRequest.errors.startPast')),
    duration_days: z
      .number({ invalid_type_error: t('adRequest.errors.durationNumber') })
      .int(t('adRequest.errors.durationWhole'))
      .min(1, t('adRequest.errors.durationMin')),
    redirect_url: z
      .string()
      .trim()
      .default('')
      .refine(isHttpUrl, t('adRequest.errors.redirectInvalid')),
    target_audience: optionalText(t('adRequest.form.targetAudience'), 500, { defaultEmpty: true }),
  });

export type AdRequestFormValues = z.infer<ReturnType<typeof buildAdRequestSchema>>;

/**
 * The booking window when the caller has not loaded one yet.
 *
 * The real one is on the AdPricing row, which both consumers already query for
 * the estimate. These are only what the form validates against while that
 * query is in flight — the server checks the live window on submit either way.
 */
export const AD_DURATION_FALLBACK = { min: 1, max: 30 } as const;

/**
 * The contract with the configured window applied.
 *
 * A factory rather than a constant because the window is a setting now:
 * Marketing can sell a 90-day campaign, and a schema compiled at import time
 * would still be refusing it at 31.
 */
export function makeAdRequestSchema(window: { min: number; max: number }, t: Translate) {
  const max = Math.max(window.min, window.max);
  return buildAdRequestSchema(t).refine((values) => values.duration_days <= max, {
    message: t('adRequest.errors.durationMax', {
      vars: { max: t('adRequest.days', { count: max }) },
    }),
    path: ['duration_days'],
  });
}

export function blankAdRequestValues(): AdRequestFormValues {
  return {
    ad_title: '',
    ad_description: '',
    ad_type: 'IMAGE',
    media_url: '',
    position: 'AUTO',
    start_at: new Date().toISOString(),
    duration_days: 7,
    redirect_url: '',
    target_audience: '',
  };
}

/**
 * Validates and maps the form values to the mutation input (empty optionals
 * dropped).
 *
 * Runs the schema again for its coercions and defaults, never for its messages
 * — the form has already blocked anything invalid — so the package's own
 * provider-free translator is enough here.
 */
export function toSubmitAdRequestInput(values: AdRequestFormValues): SubmitAdRequestInput {
  const cast = buildAdRequestSchema(adRequestT).parse(values);
  return {
    ad_title: cast.ad_title,
    ad_description: cast.ad_description,
    ad_type: cast.ad_type,
    media_url: cast.media_url,
    position: cast.position,
    start_at: new Date(cast.start_at).toISOString(),
    duration_days: cast.duration_days,
    redirect_url: cast.redirect_url || undefined,
    target_audience: cast.target_audience || undefined,
  };
}

export interface AdRequestFormProps {
  initialValues: AdRequestFormValues;
  busy: boolean;
  errorMessage?: string | null;
  onValuesChange: (values: AdRequestFormValues) => void;
  onSubmit: (values: AdRequestFormValues) => Promise<void> | void;
  /** Optional override for the submit button label (e.g. "Submit Product Ad"). */
  submitLabel?: string;
  /**
   * The booking window Marketing set. Defaults to 1–30 for the moment before
   * the pricing query lands; the slider, its labels and the schema all read it,
   * so what the form offers is what the server will accept.
   */
  durationWindow?: { min: number; max: number };
}
