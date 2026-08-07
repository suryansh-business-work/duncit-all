import { z } from 'zod';
import { startOfDay } from 'date-fns';
import { optionalText, requiredText } from '@duncit/forms';
import { AD_MEDIA_TYPE_VALUES, AD_POSITION_VALUES, type AdMediaType, type AdPosition } from './ad-options';

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

/** Ad request contract — RHF + Zod. Mirrors the server SubmitAdRequestInput rules. */
export const adRequestSchema = z.object({
  ad_title: requiredText('Ad title', 3, 120),
  ad_description: requiredText('Ad description', 10, 1000),
  ad_type: z.enum(AD_MEDIA_TYPE_VALUES, { required_error: 'Ad type is required' }),
  media_url: z.string().trim().min(1, 'Upload the ad media'),
  position: z.enum(AD_POSITION_VALUES, { required_error: 'Ad position is required' }),
  start_at: z
    .string()
    .trim()
    .min(1, 'Ad start date is required')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Ad start date must be a valid date')
    .refine(isTodayOrLater, 'Ad start date must be today or later'),
  duration_days: z
    .number({ invalid_type_error: 'Ad duration must be a number of days' })
    .int('Ad duration must be whole days')
    .min(1, 'Ad duration must be at least 1 day'),
  redirect_url: z
    .string()
    .trim()
    .default('')
    .refine(isHttpUrl, 'Redirect URL must be a valid http(s) link'),
  target_audience: optionalText('Target audience', 500, { defaultEmpty: true }),
});

export type AdRequestFormValues = z.infer<typeof adRequestSchema>;

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
export function makeAdRequestSchema(window: { min: number; max: number }) {
  const max = Math.max(window.min, window.max);
  return adRequestSchema.refine((values) => values.duration_days <= max, {
    message: `Ad duration can be at most ${max} ${max === 1 ? 'day' : 'days'}`,
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

/** Validates and maps the form values to the mutation input (empty optionals dropped). */
export function toSubmitAdRequestInput(values: AdRequestFormValues): SubmitAdRequestInput {
  const cast = adRequestSchema.parse(values);
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
