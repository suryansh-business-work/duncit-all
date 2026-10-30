import { z } from 'zod';
import { DIGITS } from '@duncit/regex';
import type { Translator } from '@duncit/app-settings';
import type { SmartIncentiveSettings, SmartIncentiveSettingsInput } from '../queries';

/*
  The server's limits, mirrored so the form can say what it accepts before a
  save is refused. The server checks them again on every save (BAD_USER_INPUT),
  and its copy is the one that counts:
  server/src/modules/engagement/smartIncentive/smartIncentive.rules.ts
*/
export const SMART_INCENTIVE_DELAY_MIN_SECONDS = 5;
export const SMART_INCENTIVE_DELAY_MAX_SECONDS = 300;
export const SMART_INCENTIVE_MAX_PCT_CEILING = 90;

/** A host's discount is a whole percent, so the cap starts at 1. */
const MAX_PCT_FLOOR = 1;

/**
 * The two numbers are held as typed, so an emptied box stays empty instead of
 * quietly becoming 0. They are parsed only when a valid form is saved.
 */
export interface SmartIncentiveSettingsValues {
  enabled: boolean;
  delay_seconds: string;
  max_discount_pct: string;
}

/** Digits only, from `min` to `max`. The message names the range, so one covers every way to miss it. */
const wholeNumberField = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .regex(DIGITS, message)
    .refine((value) => Number(value) >= min && Number(value) <= max, message);

export const makeSmartIncentiveSettingsSchema = (t: Translator['t']) =>
  z.object({
    enabled: z.boolean(),
    delay_seconds: wholeNumberField(
      SMART_INCENTIVE_DELAY_MIN_SECONDS,
      SMART_INCENTIVE_DELAY_MAX_SECONDS,
      t('loyalty.smartIncentive.delayInvalid', {
        vars: { min: SMART_INCENTIVE_DELAY_MIN_SECONDS, maxSeconds: SMART_INCENTIVE_DELAY_MAX_SECONDS },
      })
    ),
    max_discount_pct: wholeNumberField(
      MAX_PCT_FLOOR,
      SMART_INCENTIVE_MAX_PCT_CEILING,
      t('loyalty.smartIncentive.maxInvalid', { vars: { ceiling: SMART_INCENTIVE_MAX_PCT_CEILING } })
    ),
  });

/** Server settings -> form values. */
export const toFormValues = (settings: SmartIncentiveSettings): SmartIncentiveSettingsValues => ({
  enabled: settings.enabled,
  delay_seconds: String(settings.delay_seconds),
  max_discount_pct: String(settings.max_discount_pct),
});

/**
 * Valid form values -> what a save sends: only the settings that differ from
 * the ones this page loaded. The server leaves an omitted setting alone, so a
 * save never undoes a change another admin made after this page loaded.
 */
export function toSettingsInput(
  values: SmartIncentiveSettingsValues,
  loaded: SmartIncentiveSettings
): SmartIncentiveSettingsInput {
  const input: SmartIncentiveSettingsInput = {};
  const delay = Number.parseInt(values.delay_seconds, 10);
  const max = Number.parseInt(values.max_discount_pct, 10);
  if (values.enabled !== loaded.enabled) input.enabled = values.enabled;
  if (delay !== loaded.delay_seconds) input.delay_seconds = delay;
  if (max !== loaded.max_discount_pct) input.max_discount_pct = max;
  return input;
}

export interface SmartIncentiveSettingsFormProps {
  /** The settings as loaded: the form's starting values, and what a save is compared against. */
  settings: SmartIncentiveSettings;
  /** The analyst seat reads the settings with every control disabled, and is never offered Save. */
  canWrite: boolean;
  busy: boolean;
  errorMessage?: string | null;
  onSubmit: (input: SmartIncentiveSettingsInput) => Promise<void> | void;
}
