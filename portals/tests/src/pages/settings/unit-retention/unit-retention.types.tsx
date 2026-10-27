import { z } from 'zod';
import type { UnitTestSettings, UpdateUnitTestSettingsInput } from '@duncit/gql-types';

export type Translate = (key: string, options?: { vars?: Record<string, string | number> }) => string;

export type RetentionSettings = Pick<UnitTestSettings, 'retention_runs' | 'min_retention_runs' | 'max_retention_runs'>;

/** The bounds come from the server's own answer, so the form and the server cannot disagree. */
export function makeRetentionSchema(t: Translate, settings: RetentionSettings) {
  const min = settings.min_retention_runs;
  const max = settings.max_retention_runs;
  const message = t('tests.settings.retention.error', { vars: { min, max } });
  return z.object({
    retention_runs: z
      .string()
      .trim()
      .min(1, message)
      .transform(Number)
      .pipe(z.number({ error: message }).int(message).min(min, message).max(max, message)),
  });
}

export interface RetentionFormValues {
  retention_runs: string;
}

export type RetentionFormOutput = z.output<ReturnType<typeof makeRetentionSchema>>;

export const toRetentionValues = (settings: RetentionSettings): RetentionFormValues => ({
  retention_runs: String(settings.retention_runs),
});

export const toRetentionInput = (values: RetentionFormOutput): UpdateUnitTestSettingsInput => ({
  retention_runs: values.retention_runs,
});
