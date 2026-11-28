/**
 * HR employee records — the shape the HR console and the Employee console
 * agree on: enums, limits, translation keys and the GraphQL selections. Data
 * and pure helpers only; each console keeps its own UI.
 *
 * The enums and limits are not written here: they are GENERATED from the
 * server's server/src/modules/hr/hr.constants.ts (the server imports no
 * @duncit/* package) by scripts/generate-hr-constants.mjs, so the consoles and
 * the API can never disagree on a limit. Edit the server file and regenerate.
 */
import type {
  HrCompensationReason,
  HrEmployeeStatus,
  HrEmploymentType,
  HrEventKind,
  HrExitType,
  HrGender,
  HrJobChangeReason,
  HrPayComponentType,
  HrTemplateCalc,
} from './generated/hr-constants';

export {
  HR_COMPENSATION_REASONS,
  HR_EMPLOYEE_LIMITS,
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYMENT_TYPES,
  HR_EVENT_KINDS,
  HR_EXIT_TYPES,
  HR_GENDERS,
  HR_JOB_CHANGE_REASONS,
  HR_PAY_COMPONENT_TYPES,
  HR_SETTINGS_LIMITS,
  HR_TEMPLATE_CALCS,
} from './generated/hr-constants';
export type {
  HrCompensationReason,
  HrEmployeeStatus,
  HrEmploymentType,
  HrEventKind,
  HrExitType,
  HrGender,
  HrJobChangeReason,
  HrPayComponentType,
  HrTemplateCalc,
} from './generated/hr-constants';

/** The reasons HR may pick for a new revision; HIRE is written by the hire itself. */
export const HR_REVISION_REASONS = ['REVISION', 'PROMOTION', 'CORRECTION'] as const satisfies readonly HrCompensationReason[];

/** Chip colour per status, so both consoles mean the same thing by amber. */
export const HR_EMPLOYEE_STATUS_COLORS = { ACTIVE: 'success', ON_NOTICE: 'warning', EXITED: 'default' } as const;

/**
 * A value → translation-key map from the keys alone. Every key is written out in
 * full (the translation gate looks for each one as a literal) and ends in the
 * value it labels, so the value is read back from the key's last segment; the
 * `${string}.${V}` type refuses a key whose last segment is not a value.
 */
export function keyMap<V extends string>(keys: readonly `${string}.${V}`[]): Readonly<Record<V, string>> {
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
