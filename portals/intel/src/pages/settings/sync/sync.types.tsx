import { z } from 'zod';
import { intField, type Translate } from '../fields';

/** Settings › Synchronization — the same bounds the server enforces. */
export const makeSyncSchema = (t: Translate) =>
  z.object({
    paused: z.boolean(),
    interval_minutes: intField(t, 5, 1440),
    max_items_per_run: intField(t, 50, 20000),
  });

export type SyncValues = z.input<ReturnType<typeof makeSyncSchema>>;
export type SyncOutput = z.output<ReturnType<typeof makeSyncSchema>>;
