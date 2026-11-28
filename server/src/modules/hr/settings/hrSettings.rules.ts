/**
 * HR > Settings — what a save may contain.
 *
 * TWIN: `HR_SETTINGS_LIMITS` is mirrored in packages/utils/src/hr-employee.ts,
 * which the settings form validates with. Change one, change the other.
 */
import { z } from 'zod';
import { HR_PAY_COMPONENT_TYPES } from '@modules/hr/employee/employee.rules';
import { HR_TEMPLATE_CALCS } from './hrSettings.model';

export const HR_SETTINGS_LIMITS = {
  prefixMax: 10,
  digitsMin: 2,
  digitsMax: 8,
  noticeDaysMax: 365,
  probationMonthsMax: 24,
  listMax: 100,
  listItemMax: 80,
  templateMax: 20,
  templateLabelMax: 60,
  percentMax: 100,
  fixedMax: 100_000_000,
} as const;

const L = HR_SETTINGS_LIMITS;

/** Trimmed, blank-free and de-duplicated without regard to case, in the order given. */
export function cleanList(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

const list = (label: string) =>
  z
    .array(z.string().max(L.listItemMax, `${label} names are at most ${L.listItemMax} characters`))
    .max(L.listMax, `At most ${L.listMax} ${label.toLowerCase()}s`)
    .transform(cleanList);

const templateLine = z
  .object({
    label: z.string().trim().min(1, 'Name every template line').max(L.templateLabelMax, 'Template line names are too long'),
    type: z.enum(HR_PAY_COMPONENT_TYPES),
    calc: z.enum(HR_TEMPLATE_CALCS),
    value: z.number().min(0, 'Template values cannot be negative'),
    target_linked: z
      .boolean()
      .nullish()
      .transform((v) => v === true),
  })
  .refine((line) => line.calc === 'FIXED' || line.calc === 'BALANCE' || line.value <= L.percentMax, {
    message: `A percent is at most ${L.percentMax}`,
    path: ['value'],
  })
  .refine((line) => line.calc !== 'FIXED' || line.value <= L.fixedMax, { message: 'Amount is too large', path: ['value'] });

const template = z
  .array(templateLine)
  .max(L.templateMax, `At most ${L.templateMax} template lines`)
  .refine((lines) => lines.length === 0 || (lines[0]?.calc !== 'PERCENT_OF_BASIC' && lines[0]?.calc !== 'BALANCE'), {
    message: 'The first line is the basic: make it a fixed amount or a percent of CTC',
  })
  .refine((lines) => lines.filter((line) => line.calc === 'BALANCE').length <= 1, {
    message: 'Only one line can take the balance',
  })
  .refine((lines) => lines.every((line) => line.calc !== 'BALANCE' || line.type === 'EARNING'), {
    message: 'Only an earning can take the balance',
  })
  .refine((lines) => lines.every((line) => line.type === 'EARNING' || !line.target_linked), {
    message: 'Only an earning can be linked to targets',
  });

/** Every field optional: a save changes only what it names. */
export const hrSettingsSchema = z.object({
  employee_code_prefix: z
    .string()
    .trim()
    .toUpperCase()
    .max(L.prefixMax, `The prefix is at most ${L.prefixMax} characters`)
    .regex(/^[A-Z0-9]*$/, 'The prefix uses letters and digits only')
    .optional(),
  employee_code_digits: z.number().int().min(L.digitsMin).max(L.digitsMax).optional(),
  default_currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter currency code')
    .optional(),
  default_notice_period_days: z.number().int().min(0).max(L.noticeDaysMax).optional(),
  default_probation_months: z.number().int().min(0).max(L.probationMonthsMax).optional(),
  departments: list('Department').optional(),
  work_locations: list('Location').optional(),
  salary_template: template.optional(),
});

export type HrSettingsInput = z.output<typeof hrSettingsSchema>;
