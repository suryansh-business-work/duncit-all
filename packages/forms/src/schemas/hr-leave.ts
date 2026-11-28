import { z } from 'zod';
import { LEAVE_CODE } from '@duncit/regex';
import { HR_HALF_DAYS, HR_LEAVE_ACCRUALS, HR_LEAVE_LIMITS, dateOfDayKey, type HrHalfDay, type HrLeaveAccrual } from '@duncit/utils';

import type { Translate } from './translate';

/**
 * Leave: asking for it (Employee console), deciding and cancelling (manager
 * and HR), and HR's leave types, holidays, settings and balance adjustments.
 * One set of rules for every console, matching the server's twins in
 * server/src/modules/hr/leave/leave.rules.ts, which re-check every write.
 */
const DAY_MS = 86_400_000;

const isDayKey = (value: string) => dateOfDayKey(value) !== null;
const isHalfStep = (value: number) => Number.isInteger(value * 2);

/** Inclusive calendar days between two day keys, or 0 when either is not a date. */
export function leaveSpanDays(start: string, end: string): number {
  const from = dateOfDayKey(start);
  const to = dateOfDayKey(end);
  return from && to ? Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1 : 0;
}

// --- Asking --------------------------------------------------------------------

export interface LeaveRequestValues {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  /** '' for whole days. */
  half_day: '' | HrHalfDay;
  reason: string;
}

/** The API's LeaveRequestInput. */
export interface LeaveRequestOutput {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  half_day: HrHalfDay | null;
  reason: string | null;
  client_request_id: string;
}

export const leaveRequestDefaults: LeaveRequestValues = { leave_type_id: '', start_date: '', end_date: '', half_day: '', reason: '' };

export function makeLeaveRequestSchema(t: Translate) {
  const L = HR_LEAVE_LIMITS;
  return z
    .object({
      leave_type_id: z.string().min(1, t('hrShared.form.leaveTypeRequired')),
      start_date: z.string().refine(isDayKey, t('hrShared.form.dateInvalid')),
      end_date: z.string().refine(isDayKey, t('hrShared.form.dateInvalid')),
      half_day: z.union([z.literal(''), z.enum(HR_HALF_DAYS)]),
      reason: z.string().trim().max(L.reasonMax, t('hrShared.form.tooLong', { vars: { max: L.reasonMax } })),
    })
    .refine((v) => v.end_date >= v.start_date, {
      message: t('hrShared.form.endBeforeStart'),
      path: ['end_date'],
    })
    .refine((v) => !v.half_day || v.start_date === v.end_date, { message: t('hrShared.form.halfDaySameDate'), path: ['half_day'] })
    .refine((v) => leaveSpanDays(v.start_date, v.end_date) <= L.spanMax, {
      message: t('hrShared.form.spanMax', { vars: { max: L.spanMax } }),
      path: ['end_date'],
    });
}

export const toLeaveRequestInput = (values: LeaveRequestValues, clientRequestId: string): LeaveRequestOutput => ({
  leave_type_id: values.leave_type_id,
  start_date: values.start_date,
  end_date: values.end_date,
  half_day: values.half_day || null,
  reason: values.reason.trim() || null,
  client_request_id: clientRequestId,
});

// --- Notes (decline, cancel) -----------------------------------------------------

export interface HrNoteValues {
  note: string;
}

/** A note of at most the limit; at least three characters when `required` (declining, HR cancelling). */
export function makeHrNoteSchema(t: Translate, required: boolean, max: number = HR_LEAVE_LIMITS.noteMax) {
  return z.object({
    note: z
      .string()
      .trim()
      .max(max, t('hrShared.form.tooLong', { vars: { max } }))
      .refine((v) => !required || v.length >= 3, t('hrShared.form.noteRequired')),
  });
}

// --- Leave types -----------------------------------------------------------------

export interface LeaveTypeValues {
  name: string;
  code: string;
  paid: boolean;
  annual_quota: number;
  accrual: HrLeaveAccrual;
  carry_forward_max: number;
  allow_half_day: boolean;
  active: boolean;
}

export const leaveTypeDefaults: LeaveTypeValues = {
  name: '',
  code: '',
  paid: true,
  annual_quota: 12,
  accrual: 'YEARLY',
  carry_forward_max: 0,
  allow_half_day: true,
  active: true,
};

export function makeLeaveTypeSchema(t: Translate) {
  const L = HR_LEAVE_LIMITS;
  const days = (label: string) =>
    z
      .number({ error: t('hrShared.form.numberRequired') })
      .min(0, t('hrShared.form.daysRange', { vars: { what: label, max: L.quotaMax } }))
      .max(L.quotaMax, t('hrShared.form.daysRange', { vars: { what: label, max: L.quotaMax } }))
      .refine(isHalfStep, t('hrShared.form.halfSteps'));
  return z.object({
    name: z.string().trim().min(1, t('hrShared.form.required')).max(L.nameMax, t('hrShared.form.tooLong', { vars: { max: L.nameMax } })),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(LEAVE_CODE, t('hrShared.form.codeInvalid')),
    paid: z.boolean(),
    annual_quota: days(t('hrShared.form.quotaLabel')),
    accrual: z.enum(HR_LEAVE_ACCRUALS),
    carry_forward_max: days(t('hrShared.form.carryLabel')),
    allow_half_day: z.boolean(),
    active: z.boolean(),
  });
}

// --- Holidays and settings ---------------------------------------------------------

export interface HolidayValues {
  date: string;
  name: string;
}

export function makeHolidaySchema(t: Translate) {
  const L = HR_LEAVE_LIMITS;
  return z.object({
    date: z.string().refine(isDayKey, t('hrShared.form.dateInvalid')),
    name: z
      .string()
      .trim()
      .min(1, t('hrShared.form.required'))
      .max(L.holidayNameMax, t('hrShared.form.tooLong', { vars: { max: L.holidayNameMax } })),
  });
}

export interface LeaveSettingsValues {
  weekly_off_days: number[];
  leave_year_start_month: number;
  backdate_days: number;
}

export function makeLeaveSettingsSchema(t: Translate) {
  const L = HR_LEAVE_LIMITS;
  return z.object({
    weekly_off_days: z.array(z.number().int().min(0).max(6)).max(6, t('hrShared.form.weeklyOffsMax')),
    leave_year_start_month: z.number().int().min(1, t('hrShared.form.required')).max(12, t('hrShared.form.required')),
    backdate_days: z
      .number({ error: t('hrShared.form.numberRequired') })
      .int(t('hrShared.form.wholeNumber'))
      .min(0, t('hrShared.form.backdateRange', { vars: { max: L.backdateMax } }))
      .max(L.backdateMax, t('hrShared.form.backdateRange', { vars: { max: L.backdateMax } })),
  });
}

// --- Balance adjustments -----------------------------------------------------------

export interface LeaveAdjustmentValues {
  leave_type_id: string;
  days: number;
  note: string;
}

export function makeLeaveAdjustmentSchema(t: Translate) {
  const L = HR_LEAVE_LIMITS;
  return z.object({
    leave_type_id: z.string().min(1, t('hrShared.form.leaveTypeRequired')),
    days: z
      .number({ error: t('hrShared.form.numberRequired') })
      .min(-L.adjustMax, t('hrShared.form.adjustRange', { vars: { max: L.adjustMax } }))
      .max(L.adjustMax, t('hrShared.form.adjustRange', { vars: { max: L.adjustMax } }))
      .refine((v) => v !== 0, t('hrShared.form.adjustNonZero'))
      .refine(isHalfStep, t('hrShared.form.halfSteps')),
    note: z
      .string()
      .trim()
      .min(3, t('hrShared.form.noteRequired'))
      .max(L.noteMax, t('hrShared.form.tooLong', { vars: { max: L.noteMax } })),
  });
}
