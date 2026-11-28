import { z } from 'zod';
import { MONTH_KEY } from '@duncit/regex';
import { HR_ADJUSTMENT_TYPES, HR_PAYOUT_MODES, HR_PAY_TIMINGS, HR_PAYROLL_LIMITS, dateOfDayKey, type HrAdjustmentType, type HrPayTiming, type HrPayoutMode } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * Payroll: HR's one-off adjustments, holds and settings, and Finance's
 * release. Matches the server's twins in
 * server/src/modules/hr/payroll/payroll.rules.ts and payroll.settings.ts,
 * which re-check every write.
 */
const DAY_MS = 86_400_000;

const hasTwoDecimalsAtMost = (value: number) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export interface PayrollAdjustmentValues {
  label: string;
  type: HrAdjustmentType;
  amount: number;
  note: string;
}

export const payrollAdjustmentDefaults: PayrollAdjustmentValues = { label: '', type: 'EARNING', amount: 0, note: '' };

export function makePayrollAdjustmentSchema(t: Translate) {
  const P = HR_PAYROLL_LIMITS;
  return z.object({
    label: z.string().trim().min(1, t('hrShared.form.required')).max(P.labelMax, t('hrShared.form.tooLong', { vars: { max: P.labelMax } })),
    type: z.enum(HR_ADJUSTMENT_TYPES),
    amount: z
      .number({ error: t('hrShared.form.numberRequired') })
      .positive(t('hrShared.form.amountPositive'))
      .max(P.amountMax, t('hrShared.form.amountTooLarge'))
      .refine(hasTwoDecimalsAtMost, t('hrShared.form.twoDecimals')),
    note: z.string().trim().max(P.noteMax, t('hrShared.form.tooLong', { vars: { max: P.noteMax } })),
  });
}

export interface PayrollReleaseValues {
  pay_on: string;
  note: string;
}

/** A pay date from `today` up to the release limit ahead; `today` is the admin-zone day key. */
export function makePayrollReleaseSchema(t: Translate, today: string) {
  const P = HR_PAYROLL_LIMITS;
  const start = dateOfDayKey(today);
  return z.object({
    pay_on: z
      .string()
      .refine((v) => dateOfDayKey(v) !== null, t('hrShared.form.dateInvalid'))
      .refine((v) => v >= today, t('hrShared.form.payOnPast'))
      .refine((v) => {
        const day = dateOfDayKey(v);
        return !day || !start || Math.round((day.getTime() - start.getTime()) / DAY_MS) <= P.releaseAheadDays;
      }, t('hrShared.form.payOnTooFar', { vars: { max: P.releaseAheadDays } })),
    note: z.string().trim().max(P.noteMax, t('hrShared.form.tooLong', { vars: { max: P.noteMax } })),
  });
}

export interface PayrollSettingsValues {
  scheduler_enabled: boolean;
  pay_timing: HrPayTiming;
  pay_day: number;
  draft_lead_days: number;
  payout_mode: HrPayoutMode;
}

export function makePayrollSettingsSchema(t: Translate) {
  const P = HR_PAYROLL_LIMITS;
  const whole = (min: number, max: number, key: string) =>
    z
      .number({ error: t('hrShared.form.numberRequired') })
      .int(t('hrShared.form.wholeNumber'))
      .min(min, t(key, { vars: { min, max } }))
      .max(max, t(key, { vars: { min, max } }));
  return z.object({
    scheduler_enabled: z.boolean(),
    pay_timing: z.enum(HR_PAY_TIMINGS),
    pay_day: whole(P.payDayMin, P.payDayMax, 'hrShared.form.payDayRange'),
    draft_lead_days: whole(P.leadDaysMin, P.leadDaysMax, 'hrShared.form.leadDaysRange'),
    payout_mode: z.enum(HR_PAYOUT_MODES),
  });
}

export interface PayrollMonthValues {
  month: string;
}

export function makePayrollMonthSchema(t: Translate) {
  return z.object({ month: z.string().regex(MONTH_KEY, t('hrShared.form.monthRequired')) });
}
