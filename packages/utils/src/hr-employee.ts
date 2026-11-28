/**
 * HR employee records — the shape the HR console and the Employee console
 * agree on: enums, limits, translation keys and the GraphQL selections. Data
 * and pure helpers only; each console keeps its own UI.
 *
 * TWIN: the enums and `HR_EMPLOYEE_LIMITS` / `HR_SETTINGS_LIMITS` mirror
 * server/src/modules/hr/employee/employee.rules.ts and
 * server/src/modules/hr/settings/hrSettings.rules.ts, which re-check every
 * write (the server imports no @duncit/* package). Change one, change the other.
 */

export const HR_EMPLOYEE_STATUSES = ['ACTIVE', 'ON_NOTICE', 'EXITED'] as const;
export type HrEmployeeStatus = (typeof HR_EMPLOYEE_STATUSES)[number];

export const HR_EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT'] as const;
export type HrEmploymentType = (typeof HR_EMPLOYMENT_TYPES)[number];

export const HR_GENDERS = ['MALE', 'FEMALE', 'OTHER'] as const;
export type HrGender = (typeof HR_GENDERS)[number];

export const HR_EXIT_TYPES = ['RESIGNATION', 'TERMINATION', 'END_OF_CONTRACT', 'RETIREMENT', 'OTHER'] as const;
export type HrExitType = (typeof HR_EXIT_TYPES)[number];

export const HR_JOB_CHANGE_REASONS = ['PROMOTION', 'TRANSFER', 'ROLE_CHANGE', 'MANAGER_CHANGE', 'CORRECTION'] as const;
export type HrJobChangeReason = (typeof HR_JOB_CHANGE_REASONS)[number];

export const HR_PAY_COMPONENT_TYPES = ['EARNING', 'DEDUCTION', 'EMPLOYER_CONTRIBUTION'] as const;
export type HrPayComponentType = (typeof HR_PAY_COMPONENT_TYPES)[number];

/** The reasons HR may pick for a new revision; HIRE is written by the hire itself. */
export const HR_REVISION_REASONS = ['REVISION', 'PROMOTION', 'CORRECTION'] as const;
export type HrCompensationReason = 'HIRE' | (typeof HR_REVISION_REASONS)[number];

export const HR_TEMPLATE_CALCS = ['FIXED', 'PERCENT_OF_CTC', 'PERCENT_OF_BASIC', 'BALANCE'] as const;
export type HrTemplateCalc = (typeof HR_TEMPLATE_CALCS)[number];

export const HR_EVENT_KINDS = [
  'HIRED',
  'PERSONAL_UPDATED',
  'CONTACT_UPDATED',
  'JOB_CHANGED',
  'COMPENSATION_ADDED',
  'COMPENSATION_REMOVED',
  'BANK_UPDATED',
  'BANK_VIEWED',
  'EXIT_SCHEDULED',
  'EXIT_CANCELLED',
  'EXITED',
  'REHIRED',
] as const;
export type HrEventKind = (typeof HR_EVENT_KINDS)[number];

export const HR_EMPLOYEE_LIMITS = {
  nameMax: 60,
  titleMax: 120,
  departmentMax: 80,
  locationMax: 80,
  relationMax: 40,
  addressMax: 500,
  noteMax: 1000,
  codeMax: 24,
  componentsMax: 20,
  componentLabelMax: 60,
  amountMax: 100_000_000,
  noticeDaysMax: 365,
  bankNameMax: 80,
  minAgeYears: 14,
} as const;

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

/** Chip colour per status, so both consoles mean the same thing by amber. */
export const HR_EMPLOYEE_STATUS_COLORS = { ACTIVE: 'success', ON_NOTICE: 'warning', EXITED: 'default' } as const;

/**
 * A value → translation-key map from the keys alone. Every key is written out in
 * full (the translation gate looks for each one as a literal) and ends in the
 * value it labels, so the value is read back from the key's last segment; the
 * `${string}.${V}` type refuses a key whose last segment is not a value.
 */
function keyMap<V extends string>(keys: readonly `${string}.${V}`[]): Readonly<Record<V, string>> {
  return Object.fromEntries(keys.map((key) => [key.slice(key.lastIndexOf('.') + 1), key])) as Record<V, string>;
}

export const HR_EMPLOYEE_STATUS_KEYS = keyMap<HrEmployeeStatus>(['hrEmployee.status.ACTIVE', 'hrEmployee.status.ON_NOTICE', 'hrEmployee.status.EXITED']);

export const HR_EMPLOYMENT_TYPE_KEYS = keyMap<HrEmploymentType>([
  'hrEmployee.employmentType.FULL_TIME',
  'hrEmployee.employmentType.PART_TIME',
  'hrEmployee.employmentType.CONTRACT',
  'hrEmployee.employmentType.INTERN',
  'hrEmployee.employmentType.CONSULTANT',
]);

export const HR_GENDER_KEYS = keyMap<HrGender>(['hrEmployee.gender.MALE', 'hrEmployee.gender.FEMALE', 'hrEmployee.gender.OTHER']);

export const HR_EXIT_TYPE_KEYS = keyMap<HrExitType>([
  'hrEmployee.exitType.RESIGNATION',
  'hrEmployee.exitType.TERMINATION',
  'hrEmployee.exitType.END_OF_CONTRACT',
  'hrEmployee.exitType.RETIREMENT',
  'hrEmployee.exitType.OTHER',
]);

export const HR_JOB_CHANGE_REASON_KEYS = keyMap<HrJobChangeReason>([
  'hrEmployee.jobReason.PROMOTION',
  'hrEmployee.jobReason.TRANSFER',
  'hrEmployee.jobReason.ROLE_CHANGE',
  'hrEmployee.jobReason.MANAGER_CHANGE',
  'hrEmployee.jobReason.CORRECTION',
]);

export const HR_PAY_TYPE_KEYS = keyMap<HrPayComponentType>(['hrEmployee.payType.EARNING', 'hrEmployee.payType.DEDUCTION', 'hrEmployee.payType.EMPLOYER_CONTRIBUTION']);

export const HR_COMPENSATION_REASON_KEYS = keyMap<HrCompensationReason>([
  'hrEmployee.payReason.HIRE',
  'hrEmployee.payReason.REVISION',
  'hrEmployee.payReason.PROMOTION',
  'hrEmployee.payReason.CORRECTION',
]);

export const HR_TEMPLATE_CALC_KEYS = keyMap<HrTemplateCalc>([
  'hrEmployee.templateCalc.FIXED',
  'hrEmployee.templateCalc.PERCENT_OF_CTC',
  'hrEmployee.templateCalc.PERCENT_OF_BASIC',
  'hrEmployee.templateCalc.BALANCE',
]);

export const HR_EVENT_KIND_KEYS = keyMap<HrEventKind>([
  'hrEmployee.event.HIRED',
  'hrEmployee.event.PERSONAL_UPDATED',
  'hrEmployee.event.CONTACT_UPDATED',
  'hrEmployee.event.JOB_CHANGED',
  'hrEmployee.event.COMPENSATION_ADDED',
  'hrEmployee.event.COMPENSATION_REMOVED',
  'hrEmployee.event.BANK_UPDATED',
  'hrEmployee.event.BANK_VIEWED',
  'hrEmployee.event.EXIT_SCHEDULED',
  'hrEmployee.event.EXIT_CANCELLED',
  'hrEmployee.event.EXITED',
  'hrEmployee.event.REHIRED',
]);

type T = (key: string) => string;
type Option<V extends string> = { value: V; label: string };

/** `[{ value, label }]` for a select, labelled through `keys`. */
export const hrOptions = <V extends string>(values: readonly V[], keys: Readonly<Record<V, string>>, t: T): Option<V>[] =>
  values.map((value) => ({ value, label: t(keys[value]) }));

export const canScheduleHrExit = (status: HrEmployeeStatus) => status === 'ACTIVE' || status === 'ON_NOTICE';
export const canCancelHrExit = (status: HrEmployeeStatus) => status === 'ON_NOTICE';
export const canRehireHrEmployee = (status: HrEmployeeStatus) => status === 'EXITED';
export const isHrRecordEditable = (status: HrEmployeeStatus) => status !== 'EXITED';
