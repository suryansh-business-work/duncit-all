/**
 * The HR forms' field groups — the same rules the server's employee.rules.ts
 * re-checks on every write, so anything it would refuse is marked here first,
 * on the field that is wrong. Each group transforms into the API's own input.
 */
import { z } from 'zod';
import { BANK_ACCOUNT_NUMBER, EMAIL, IFSC, PAN, UAN } from '@duncit/regex';
import { makeHrContactShape, refineHrEmergency, toHrContactOutput } from '@duncit/forms/schemas';
import {
  HR_EMPLOYEE_LIMITS as L,
  HR_EMPLOYMENT_TYPES,
  HR_GENDERS,
  HR_PAY_COMPONENT_TYPES,
  dateOfDayKey,
  dayKeyOf,
} from '@duncit/utils';
import type { Translate } from './employee-fields.types';

const CURRENCY = /^[A-Za-z]{3}$/;

const isDay = (v: string) => dateOfDayKey(v) !== null;
const blank = (v: string) => v.trim() || null;
const tooLong = (t: Translate, max: number) => t('hrEmployee.form.tooLong', { vars: { max } });
const text = (t: Translate, max: number) => z.string().trim().max(max, tooLong(t, max));
const requiredText = (t: Translate, max: number) => text(t, max).min(1, t('hrEmployee.form.required'));
const day = (t: Translate) => z.string().refine(isDay, t('hrEmployee.form.dateInvalid'));
const optionalDay = (t: Translate) => z.string().refine((v) => !v || isDay(v), t('hrEmployee.form.dateInvalid'));

/** Whole years from a `YYYY-MM-DD` birth date to today. */
function ageOn(birth: string, today: string): number {
  const [by, bm, bd] = birth.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export function personalSchema(t: Translate, today: string = dayKeyOf(new Date())) {
  return z
    .object({
      ...makeHrContactShape(t),
      first_name: requiredText(t, L.nameMax),
      last_name: requiredText(t, L.nameMax),
      gender: z.union([z.literal(''), z.enum(HR_GENDERS)]),
      date_of_birth: optionalDay(t),
    })
    .superRefine(refineHrEmergency(t))
    .superRefine((v, ctx) => {
      if (!v.date_of_birth || !isDay(v.date_of_birth)) return;
      if (v.date_of_birth >= today || ageOn(v.date_of_birth, today) < L.minAgeYears) {
        ctx.addIssue({ code: 'custom', path: ['date_of_birth'], message: t('hrEmployee.hint.dateOfBirth', { vars: { age: L.minAgeYears } }) });
      }
    })
    .transform((v) => ({
      ...toHrContactOutput(v),
      first_name: v.first_name,
      last_name: v.last_name,
      gender: v.gender || null,
      date_of_birth: v.date_of_birth || null,
    }));
}

export function jobSchema(t: Translate) {
  return z
    .object({
      job_title: requiredText(t, L.titleMax),
      department: text(t, L.departmentMax),
      work_location: text(t, L.locationMax),
      manager: z.object({ id: z.string(), employee_code: z.string(), name: z.string(), job_title: z.string().nullable() }).nullable(),
      employment_type: z.enum(HR_EMPLOYMENT_TYPES),
      date_of_joining: day(t),
      probation_end_date: optionalDay(t),
      notice_period_days: z
        .string()
        .trim()
        .refine((v) => /^\d+$/.test(v) && Number(v) <= L.noticeDaysMax, t('hrEmployee.form.noticeInvalid', { vars: { max: L.noticeDaysMax } })),
      work_email: z.string().trim().refine((v) => !v || EMAIL.test(v), t('hrEmployee.form.emailInvalid')),
    })
    .superRefine((v, ctx) => {
      if (v.probation_end_date && v.probation_end_date < v.date_of_joining) {
        ctx.addIssue({ code: 'custom', path: ['probation_end_date'], message: t('hrEmployee.form.probationBeforeJoining') });
      }
    })
    .transform((v) => ({
      job_title: v.job_title,
      department: blank(v.department),
      work_location: blank(v.work_location),
      manager_id: v.manager?.id ?? null,
      employment_type: v.employment_type,
      date_of_joining: v.date_of_joining,
      probation_end_date: v.probation_end_date || null,
      notice_period_days: Number(v.notice_period_days),
      work_email: blank(v.work_email)?.toLowerCase() ?? null,
    }));
}

const payLine = (t: Translate) =>
  z
    .object({
      label: requiredText(t, L.componentLabelMax),
      type: z.enum(HR_PAY_COMPONENT_TYPES),
      monthly_amount: z
        .string()
        .trim()
        .refine((v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0 && Number(v) <= L.amountMax, t('hrEmployee.form.amountInvalid', { vars: { max: L.amountMax } })),
      target_linked: z.boolean(),
    })
    .superRefine((line, ctx) => {
      if (line.target_linked && line.type !== 'EARNING') ctx.addIssue({ code: 'custom', path: ['target_linked'], message: t('hrEmployee.form.targetOnlyEarning') });
    })
    .transform((line) => ({ ...line, monthly_amount: Number(line.monthly_amount) }));

export function paySchema(t: Translate) {
  return z
    .object({
      currency: z.string().trim().refine((v) => CURRENCY.test(v), t('hrEmployee.form.currencyInvalid')),
      effective_from: day(t),
      reason: z.enum(['HIRE', 'REVISION', 'PROMOTION', 'CORRECTION']),
      note: text(t, L.noteMax),
      annual_ctc: z.string(),
      lines: z.array(payLine(t)).max(L.componentsMax, t('hrEmployee.form.payLinesMax', { vars: { max: L.componentsMax } })),
    })
    .superRefine((v, ctx) => {
      if (!v.lines.some((line) => line.type === 'EARNING' && line.monthly_amount > 0)) {
        ctx.addIssue({ code: 'custom', path: ['lines'], message: t('hrEmployee.form.earningRequired') });
      }
    })
    .transform((v) => ({
      currency: v.currency.toUpperCase(),
      effective_from: v.effective_from,
      reason: v.reason,
      note: blank(v.note),
      components: v.lines,
    }));
}

/**
 * Bank and statutory details. With `keep` set for a stored secret, an empty
 * box means "keep the stored one" and the key is left out of the input, which
 * is how the server tells keep from clear.
 */
export function bankSchema(t: Translate, keep: { account: boolean; pan: boolean } = { account: false, pan: false }) {
  const upper = (rx: RegExp, key: string) => z.string().trim().refine((v) => !v || rx.test(v.toUpperCase()), t(key));
  return z
    .object({
      account_holder_name: text(t, L.nameMax * 2),
      account_number: z.string().trim().refine((v) => !v || BANK_ACCOUNT_NUMBER.test(v), t('hrEmployee.form.accountNumberInvalid')),
      ifsc: upper(IFSC, 'hrEmployee.form.ifscInvalid'),
      bank_name: text(t, L.bankNameMax),
      pan: upper(PAN, 'hrEmployee.form.panInvalid'),
      uan: z.string().trim().refine((v) => !v || UAN.test(v), t('hrEmployee.form.uanInvalid')),
    })
    .transform((v) => ({
      account_holder_name: blank(v.account_holder_name),
      ...(keep.account && !v.account_number ? {} : { account_number: v.account_number }),
      ifsc: blank(v.ifsc)?.toUpperCase() ?? null,
      bank_name: blank(v.bank_name),
      ...(keep.pan && !v.pan ? {} : { pan: v.pan.toUpperCase() }),
      uan: blank(v.uan),
    }));
}
