import { z } from 'zod';
import { HR_PAY_COMPONENT_TYPES, HR_SETTINGS_LIMITS as L, HR_TEMPLATE_CALCS, type HrSettingsRecord } from '@duncit/utils';
import type { HrSettingsFormValues, Translate } from './hr-settings.types';

const PREFIX = /^[A-Za-z0-9]*$/;
const CURRENCY = /^[A-Za-z]{3}$/;

/** A whole number from min to max, typed as text. */
const wholeIn = (min: number, max: number, message: string) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) >= min && Number(v) <= max, message)
    .transform(Number);

const templateRow = (t: Translate) =>
  z
    .object({
      label: z
        .string()
        .trim()
        .min(1, t('hrEmployee.form.payLabelRequired'))
        .max(L.templateLabelMax, t('hrEmployee.form.tooLong', { vars: { max: L.templateLabelMax } })),
      type: z.enum(HR_PAY_COMPONENT_TYPES),
      calc: z.enum(HR_TEMPLATE_CALCS),
      value: z.string().trim(),
      target_linked: z.boolean(),
    })
    .superRefine((row, ctx) => {
      const n = Number(row.value || 0);
      const isPercent = row.calc === 'PERCENT_OF_CTC' || row.calc === 'PERCENT_OF_BASIC';
      if (!Number.isFinite(n) || n < 0 || n > L.fixedMax) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: t('hrEmployee.form.amountInvalid', { vars: { max: L.fixedMax } }) });
      } else if (isPercent && n > L.percentMax) {
        ctx.addIssue({ code: 'custom', path: ['value'], message: t('hrEmployee.settings.percentMax', { vars: { max: L.percentMax } }) });
      }
      if (row.target_linked && row.type !== 'EARNING') {
        ctx.addIssue({ code: 'custom', path: ['target_linked'], message: t('hrEmployee.form.targetOnlyEarning') });
      }
    })
    .transform((row) => ({ ...row, value: row.calc === 'BALANCE' ? 0 : Number(row.value || 0) }));

/**
 * The same rules the server's hrSettingsSchema applies, so a save it would
 * refuse is marked here first, field by field.
 */
export const hrSettingsSchema = (t: Translate) => {
  const range = (min: number, max: number) => t('hrEmployee.settings.rangeInvalid', { vars: { min, max } });
  const listItem = z.object({ value: z.string().trim().max(L.listItemMax, t('hrEmployee.form.tooLong', { vars: { max: L.listItemMax } })) });
  return z
    .object({
      employee_code_prefix: z
        .string()
        .trim()
        .max(L.prefixMax, t('hrEmployee.settings.prefixInvalid', { vars: { max: L.prefixMax } }))
        .refine((v) => PREFIX.test(v), t('hrEmployee.settings.prefixInvalid', { vars: { max: L.prefixMax } }))
        .transform((v) => v.toUpperCase()),
      employee_code_digits: wholeIn(L.digitsMin, L.digitsMax, t('hrEmployee.settings.digitsInvalid', { vars: { min: L.digitsMin, max: L.digitsMax } })),
      default_currency: z
        .string()
        .trim()
        .refine((v) => CURRENCY.test(v), t('hrEmployee.form.currencyInvalid'))
        .transform((v) => v.toUpperCase()),
      default_notice_period_days: wholeIn(0, L.noticeDaysMax, range(0, L.noticeDaysMax)),
      default_probation_months: wholeIn(0, L.probationMonthsMax, range(0, L.probationMonthsMax)),
      departments: z.array(listItem).max(L.listMax),
      work_locations: z.array(listItem).max(L.listMax),
      salary_template: z.array(templateRow(t)).max(L.templateMax),
    })
    .superRefine((values, ctx) => {
      const rows = values.salary_template;
      if (rows[0] && (rows[0].calc === 'PERCENT_OF_BASIC' || rows[0].calc === 'BALANCE')) {
        ctx.addIssue({ code: 'custom', path: ['salary_template', 0, 'calc'], message: t('hrEmployee.settings.templateFirstLine') });
      }
      rows.forEach((row, index) => {
        if (row.calc === 'BALANCE' && row.type !== 'EARNING') {
          ctx.addIssue({ code: 'custom', path: ['salary_template', index, 'calc'], message: t('hrEmployee.settings.templateBalanceEarning') });
        }
      });
      if (rows.filter((row) => row.calc === 'BALANCE').length > 1) {
        ctx.addIssue({ code: 'custom', path: ['salary_template'], message: t('hrEmployee.settings.templateOneBalance') });
      }
    })
    .transform((values) => ({
      ...values,
      departments: values.departments.map((item) => item.value).filter(Boolean),
      work_locations: values.work_locations.map((item) => item.value).filter(Boolean),
    }));
};

export function valuesFromSettings(settings: HrSettingsRecord): HrSettingsFormValues {
  return {
    employee_code_prefix: settings.employee_code_prefix,
    employee_code_digits: String(settings.employee_code_digits),
    default_currency: settings.default_currency,
    default_notice_period_days: String(settings.default_notice_period_days),
    default_probation_months: String(settings.default_probation_months),
    departments: settings.departments.map((value) => ({ value })),
    work_locations: settings.work_locations.map((value) => ({ value })),
    salary_template: settings.salary_template.map((line) => ({ ...line, value: String(line.value) })),
  };
}
