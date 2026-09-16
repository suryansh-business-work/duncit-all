import { z } from 'zod';
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns';
import type { Translate } from '@duncit/forms/schemas';

/** A window of calendar days, as MSG91's reports take them: `yyyy-MM-dd`. */
export interface DateWindowValues {
  start: string;
  end: string;
}

export const DAY_PATTERN = 'yyyy-MM-dd';

const dayOf = (date: Date) => format(date, DAY_PATTERN);

/** The widest window allowed, ending today. */
export const windowEndingToday = (days: number): DateWindowValues => {
  const now = new Date();
  return { start: dayOf(subDays(now, days)), end: dayOf(now) };
};

/**
 * Both days set, in order, no wider than `maxDays`, and not ending in the
 * future — the same refusals MSG91 makes, said before the round trip.
 * `yyyy-MM-dd` strings compare correctly as text.
 */
export const makeDateWindowSchema = (t: Translate, maxDays: number) =>
  z
    .object({
      start: z.string().min(1, t('tech.msg91.validation.dateRequired')),
      end: z.string().min(1, t('tech.msg91.validation.dateRequired')),
    })
    .superRefine((values, ctx) => {
      if (!values.start || !values.end) return;
      const span = differenceInCalendarDays(parseISO(values.end), parseISO(values.start));
      if (span < 0) {
        ctx.addIssue({ code: 'custom', path: ['start'], message: t('tech.msg91.validation.rangeOrder') });
      } else if (span > maxDays) {
        ctx.addIssue({
          code: 'custom',
          path: ['start'],
          message: t('tech.msg91.validation.rangeTooWide', { vars: { days: maxDays } }),
        });
      }
      if (values.end > dayOf(new Date())) {
        ctx.addIssue({ code: 'custom', path: ['end'], message: t('tech.msg91.validation.futureDate') });
      }
    });
