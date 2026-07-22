import { z } from 'zod';

/** Telemetry Logs Settings form — mirrors the server clamps (levels ≥1, days 1..90). */
export const telemetrySettingsSchema = z.object({
  signoz_enabled: z.boolean(),
  persisted_levels: z
    .array(z.enum(['error', 'warn', 'info', 'debug']))
    .min(1, 'Select at least one level to persist'),
  retention_days: z.coerce
    .number()
    .int('Whole days only')
    .min(1, 'At least 1 day')
    .max(90, 'At most 90 days'),
});

export type TelemetrySettingsForm = z.infer<typeof telemetrySettingsSchema>;
