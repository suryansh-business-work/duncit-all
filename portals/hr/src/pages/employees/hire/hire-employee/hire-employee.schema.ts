import { z } from 'zod';
import type { FieldPath } from 'react-hook-form';
import { DIAL_CODE, EMAIL, PHONE_INTL } from '@duncit/regex';
import { HR_EMPLOYEE_LIMITS as L, type HrSettingsRecord } from '@duncit/utils';
import { bankSchema, jobSchema, paySchema, personalSchema } from '../../fields/employee-fields.schema';
import { EMPTY_BANK, EMPTY_PERSONAL, emptyJob, emptyPay } from '../../fields/employee-fields.defaults';
import type { PayValues } from '../../fields/employee-fields.types';
import type { HireFormValues, HireStep, PresetAccount, Translate } from './hire-employee.types';

const CODE = /^[A-Za-z0-9-]*$/;

/** The form paths each step owns, validated before Next moves on. */
export const STEP_FIELDS: Readonly<Record<HireStep, FieldPath<HireFormValues>[]>> = {
  account: ['account_mode', 'account', 'new_email', 'new_phone_extension', 'new_phone_number', 'employee_code'],
  personal: ['personal'],
  job: ['job'],
  pay: ['include_pay', 'pay'],
  bank: ['bank'],
  review: [],
};

/** Copy a nested schema's issues onto the root, under `path`. */
function forward(ctx: z.RefinementCtx, path: string, issues: readonly z.core.$ZodIssue[]) {
  for (const issue of issues) ctx.addIssue({ code: 'custom', path: [path, ...issue.path], message: issue.message });
}

/**
 * The whole hire, step by step, with the server's rules: exactly one account
 * (picked or new), a valid code, the personal and job groups, pay only when
 * HR chose to add it now (and never before the joining date), and bank details.
 */
export function hireSchema(t: Translate) {
  const personal = personalSchema(t);
  const job = jobSchema(t);
  const pay = paySchema(t);
  const bank = bankSchema(t);
  return z
    .object({
      account_mode: z.enum(['EXISTING', 'NEW']),
      account: z.object({ id: z.string(), name: z.string(), email: z.string().nullable() }).nullable(),
      new_email: z.string().trim(),
      new_phone_extension: z.string().trim(),
      new_phone_number: z.string().trim(),
      employee_code: z
        .string()
        .trim()
        .max(L.codeMax, t('hrEmployee.form.tooLong', { vars: { max: L.codeMax } }))
        .refine((v) => CODE.test(v), t('hrEmployee.form.codeInvalid')),
      personal,
      job,
      include_pay: z.boolean(),
      pay: z.custom<PayValues>(),
      bank,
    })
    .superRefine((v, ctx) => {
      if (v.account_mode === 'EXISTING' && !v.account) {
        ctx.addIssue({ code: 'custom', path: ['account'], message: t('hrEmployee.form.accountRequired') });
      }
      if (v.account_mode === 'NEW') {
        if (!EMAIL.test(v.new_email)) ctx.addIssue({ code: 'custom', path: ['new_email'], message: t('hrEmployee.form.emailInvalid') });
        if (v.new_phone_number && !PHONE_INTL.test(v.new_phone_number)) {
          ctx.addIssue({ code: 'custom', path: ['new_phone_number'], message: t('hrEmployee.form.phoneInvalid') });
        }
        if (!DIAL_CODE.test(v.new_phone_extension)) {
          ctx.addIssue({ code: 'custom', path: ['new_phone_extension'], message: t('hrEmployee.form.dialCodeInvalid') });
        }
      }
      if (!v.include_pay) return;
      const parsed = pay.safeParse(v.pay);
      if (!parsed.success) return forward(ctx, 'pay', parsed.error.issues);
      if (parsed.data.effective_from < v.job.date_of_joining) {
        ctx.addIssue({ code: 'custom', path: ['pay', 'effective_from'], message: t('hrEmployee.form.payBeforeJoining') });
      }
    })
    .transform((v) => ({
      account_user_id: v.account_mode === 'EXISTING' ? (v.account?.id ?? null) : null,
      new_account:
        v.account_mode === 'NEW'
          ? { email: v.new_email.toLowerCase(), phone_number: v.new_phone_number || null, phone_extension: v.new_phone_extension || null }
          : null,
      employee_code: v.employee_code ? v.employee_code.toUpperCase() : null,
      personal: v.personal,
      job: v.job,
      compensation: v.include_pay ? { ...pay.parse(v.pay), reason: 'HIRE' as const } : null,
      bank: v.bank,
    }));
}

/** First and last name from an account's display name, for the personal step. */
function splitName(name: string): { first_name: string; last_name: string } {
  const parts = name.trim().split(/\s+/);
  return { first_name: parts[0] ?? '', last_name: parts.slice(1).join(' ') };
}

export function initialHireValues(settings: HrSettingsRecord, preset: PresetAccount | null): HireFormValues {
  return {
    account_mode: 'EXISTING',
    account: preset,
    new_email: '',
    new_phone_extension: '+91',
    new_phone_number: '',
    employee_code: '',
    personal: preset ? { ...EMPTY_PERSONAL, ...splitName(preset.name) } : EMPTY_PERSONAL,
    job: emptyJob(settings),
    include_pay: true,
    pay: emptyPay(settings.default_currency, '', 'HIRE'),
    bank: EMPTY_BANK,
  };
}

export { splitName };
