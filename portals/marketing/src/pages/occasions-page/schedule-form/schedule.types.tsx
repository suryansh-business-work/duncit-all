import { z } from 'zod';
import type { OccasionScheduleInput, OccasionTheme } from '@duncit/gql-types';
import type { Translate } from '@duncit/shell';

/** The server keeps a priority inside this range. */
export const PRIORITY = { min: -1000, max: 1000 } as const;

export interface ScheduleFormValues {
  /** ISO date-time, or '' for none. */
  starts_at: string;
  ends_at: string;
  sort_order: number;
  schedule_enabled: boolean;
}

export type ScheduledLook = Pick<OccasionTheme, 'key' | 'name' | 'starts_at' | 'ends_at' | 'sort_order' | 'schedule_enabled'>;

export const scheduleValues = (look: ScheduledLook): ScheduleFormValues => ({
  starts_at: look.starts_at ?? '',
  ends_at: look.ends_at ?? '',
  sort_order: look.sort_order,
  schedule_enabled: look.schedule_enabled,
});

export const toScheduleInput = (values: ScheduleFormValues): OccasionScheduleInput => ({
  starts_at: values.starts_at || null,
  ends_at: values.ends_at || null,
  sort_order: values.sort_order,
  schedule_enabled: values.schedule_enabled,
});

const time = (iso: string) => new Date(iso).getTime();

/** The server's own rules, said first: both ends to switch it on, and the end after the start. */
export const scheduleSchema = (t: Translate) =>
  z
    .object({
      starts_at: z.string(),
      ends_at: z.string(),
      sort_order: z.coerce
        .number()
        .int(t('marketing.occasions.schedule.wholeNumber'))
        .min(PRIORITY.min, t('marketing.occasions.schedule.priorityRange', { vars: PRIORITY }))
        .max(PRIORITY.max, t('marketing.occasions.schedule.priorityRange', { vars: PRIORITY })),
      schedule_enabled: z.boolean(),
    })
    .superRefine((values, ctx) => {
      if (values.schedule_enabled && !values.starts_at) {
        ctx.addIssue({ code: 'custom', path: ['starts_at'], message: t('marketing.occasions.schedule.startRequired') });
      }
      if (values.schedule_enabled && !values.ends_at) {
        ctx.addIssue({ code: 'custom', path: ['ends_at'], message: t('marketing.occasions.schedule.endRequired') });
      }
      if (values.starts_at && values.ends_at && time(values.ends_at) <= time(values.starts_at)) {
        ctx.addIssue({ code: 'custom', path: ['ends_at'], message: t('marketing.occasions.schedule.endAfterStart') });
      }
    });

export interface ScheduleFormProps {
  /** The look whose window is edited; null keeps the dialog closed. */
  look: ScheduledLook | null;
  onClose: () => void;
  /** Resolves true once the server has the window. */
  onSubmit: (key: string, input: OccasionScheduleInput) => Promise<boolean>;
}
