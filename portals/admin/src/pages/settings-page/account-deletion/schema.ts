import { z } from 'zod';

/** Mirrors the server clamp in `accountDeletion.model.ts`. */
export const MIN_RETENTION_DAYS = 1;
export const MAX_RETENTION_DAYS = 365;
export const MIN_BATCH_SIZE = 1;
export const MAX_BATCH_SIZE = 500;

/**
 * `HH:mm`, the same shape `parseTimeOfDay` accepts on the server.
 *
 * Checked here as well as there because a time the scheduler cannot read makes
 * the sweep answer "not due" forever — a job that silently never runs. The
 * server is what decides; this is what stops somebody finding out a week later.
 */
const TIME_PATTERN = /^([01]?\d|2[0-3]):[0-5]\d$/;

/**
 * The whole Account deletion card, as one form.
 *
 * The window and the schedule are validated together and SAVED separately —
 * they are different promises, and the server keeps them in different
 * mutations so that moving one can never move the other.
 */
export const deletionSettingsSchema = z.object({
  retention_days: z.coerce
    .number()
    .int()
    .min(MIN_RETENTION_DAYS)
    .max(MAX_RETENTION_DAYS),
  cron_enabled: z.boolean(),
  cron_frequency: z.enum(['DAILY', 'WEEKLY']),
  cron_time_of_day: z.string().regex(TIME_PATTERN),
  cron_weekday: z.coerce.number().int().min(0).max(6),
  cron_batch_size: z.coerce.number().int().min(MIN_BATCH_SIZE).max(MAX_BATCH_SIZE),
});

export type DeletionSettingsValues = z.infer<typeof deletionSettingsSchema>;
