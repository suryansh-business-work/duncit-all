import { z } from 'zod';

/** 24-hour `HH:mm`, the shape the server parses and stores. */
const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Backup schedule form — mirrors the server's own clamps (weekday 0..6,
 * keepLast 1..90, HH:mm), so a value this accepts is never one the mutation
 * turns around and rejects.
 */
export const backupSettingsSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  timeOfDay: z.string().regex(TIME_OF_DAY, 'Use a 24-hour time, for example 03:00'),
  weekday: z.coerce.number().int().min(0).max(6),
  keepLast: z.coerce
    .number()
    .int('Whole backups only')
    .min(1, 'Keep at least 1')
    .max(90, 'Keep at most 90'),
});

export type BackupSettingsForm = z.infer<typeof backupSettingsSchema>;
