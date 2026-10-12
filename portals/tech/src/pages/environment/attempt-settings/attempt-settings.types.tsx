import { z } from 'zod';
import type { EnvAttemptSettings } from '../queries';

/** The same bounds the server enforces in envAttempt.service. */
export const ATTEMPT_BOUNDS = {
  window_hours: { min: 1, max: 720 },
  max_attempts: { min: 0, max: 1000 },
} as const;

export interface AttemptSettingsMessages {
  whole: string;
  range: (min: number, max: number) => string;
}

const wholeIn = (m: AttemptSettingsMessages, { min, max }: { min: number; max: number }) =>
  z.coerce.number({ message: m.whole }).int(m.whole).min(min, m.range(min, max)).max(max, m.range(min, max));

export const attemptSettingsSchema = (m: AttemptSettingsMessages) =>
  z.object({
    window_hours: wholeIn(m, ATTEMPT_BOUNDS.window_hours),
    /** category → max attempts per window; 0 is unlimited. */
    limits: z.record(z.string(), wholeIn(m, ATTEMPT_BOUNDS.max_attempts)),
  });

export type AttemptSettingsValues = z.infer<ReturnType<typeof attemptSettingsSchema>>;

export const toAttemptSettingsForm = (settings: EnvAttemptSettings): AttemptSettingsValues => ({
  window_hours: settings.window_hours,
  limits: Object.fromEntries(settings.limits.map((limit) => [limit.category, limit.max_attempts])),
});

/** The mutation's input: every category the form shows, with the cap typed for it. */
export const toAttemptSettingsInput = (values: AttemptSettingsValues) => ({
  window_hours: values.window_hours,
  limits: Object.entries(values.limits).map(([category, max_attempts]) => ({ category, max_attempts })),
});
