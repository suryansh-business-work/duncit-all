import { z } from 'zod';
import type { TestsConfidenceSignalKey, TestsSettings, UpdateTestsSettingsInput } from '@duncit/gql-types';

export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

/** A whole number typed into a text field, held to the bounds the server enforces. */
const wholeNumber = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .transform(Number)
    .pipe(z.number({ error: message }).int(message).min(min, message).max(max, message));

/**
 * The confidence settings' rules — the server's (testsOverview.settings.ts),
 * so a value it would refuse is caught here first. The signal list comes from
 * the server's answer, never from a copy kept here.
 */
export function makeConfidenceSchema(t: Translate) {
  return z
    .object({
      weights: z
        .array(
          z.object({
            signal: z.custom<TestsConfidenceSignalKey>((value) => typeof value === 'string'),
            weight: wholeNumber(0, 100, t('tests.settings.confidence.errors.weight')),
          })
        )
        .refine((weights) => weights.some((w) => w.weight > 0), {
          message: t('tests.settings.confidence.errors.noWeight'),
        }),
      high_min: wholeNumber(1, 100, t('tests.settings.confidence.errors.band')),
      medium_min: wholeNumber(0, 99, t('tests.settings.confidence.errors.band')),
      regression_penalty: wholeNumber(1, 100, t('tests.settings.confidence.errors.penalty')),
    })
    .refine((values) => values.medium_min < values.high_min, {
      path: ['medium_min'],
      message: t('tests.settings.confidence.errors.bandOrder'),
    });
}

export interface ConfidenceFormValues {
  weights: { signal: TestsConfidenceSignalKey; weight: string }[];
  high_min: string;
  medium_min: string;
  regression_penalty: string;
}

export type ConfidenceFormOutput = z.output<ReturnType<typeof makeConfidenceSchema>>;

export type ConfidenceSettings = Pick<TestsSettings, 'weights' | 'high_min' | 'medium_min' | 'regression_penalty'>;

export const toConfidenceValues = (settings: ConfidenceSettings): ConfidenceFormValues => ({
  weights: settings.weights.map((w) => ({ signal: w.signal, weight: String(w.weight) })),
  high_min: String(settings.high_min),
  medium_min: String(settings.medium_min),
  regression_penalty: String(settings.regression_penalty),
});

export const toConfidenceInput = (values: ConfidenceFormOutput): UpdateTestsSettingsInput => ({
  weights: values.weights.map((w) => ({ signal: w.signal, weight: w.weight })),
  high_min: values.high_min,
  medium_min: values.medium_min,
  regression_penalty: values.regression_penalty,
});
