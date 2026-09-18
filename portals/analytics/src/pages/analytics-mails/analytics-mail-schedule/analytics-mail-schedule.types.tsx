import { z } from 'zod';
import { TIME_OF_DAY_PATTERN } from '@duncit/forms';
import type { AnalyticsMailSettings } from '../queries';

/** When reports go out if nobody has chosen: the start of the working day. */
export const DEFAULT_SEND_TIME = '09:00';

export interface ScheduleMessages {
  timeFormat: string;
}

export const scheduleSchema = (messages: ScheduleMessages) =>
  z.object({
    enabled: z.boolean(),
    // Wall-clock in the platform's own zone, not this browser's.
    time_of_day: z.string().trim().regex(TIME_OF_DAY_PATTERN, messages.timeFormat),
    weekday: z.number().int().min(0).max(6),
  });

export type ScheduleValues = z.infer<ReturnType<typeof scheduleSchema>>;

export const toScheduleValues = (settings: AnalyticsMailSettings): ScheduleValues => ({
  enabled: settings.enabled,
  time_of_day: settings.time_of_day,
  weekday: settings.weekday,
});
