import { describe, expect, it } from 'vitest';
import {
  HR_COMPENSATION_REASON_KEYS,
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYEE_STATUS_KEYS,
  HR_EVENT_KINDS,
  HR_EVENT_KIND_KEYS,
  HR_EMPLOYMENT_TYPES,
  HR_EMPLOYMENT_TYPE_KEYS,
  HR_EXIT_TYPES,
  HR_EXIT_TYPE_KEYS,
  HR_GENDERS,
  HR_GENDER_KEYS,
  HR_JOB_CHANGE_REASONS,
  HR_JOB_CHANGE_REASON_KEYS,
  HR_PAY_COMPONENT_TYPES,
  HR_PAY_TYPE_KEYS,
  HR_REVISION_REASONS,
  HR_TEMPLATE_CALCS,
  HR_TEMPLATE_CALC_KEYS,
  canCancelHrExit,
  canRehireHrEmployee,
  canScheduleHrExit,
  hrOptions,
  isHrRecordEditable,
} from '../src';

describe('hrOptions', () => {
  it('labels every value through its key, in order', () => {
    const t = (key: string) => `T(${key})`;
    expect(hrOptions(HR_EMPLOYMENT_TYPES, HR_EMPLOYMENT_TYPE_KEYS, t)[0]).toEqual({
      value: 'FULL_TIME',
      label: 'T(hrEmployee.employmentType.FULL_TIME)',
    });
    expect(hrOptions(HR_EMPLOYEE_STATUSES, HR_EMPLOYEE_STATUS_KEYS, t).map((o) => o.value)).toEqual(['ACTIVE', 'ON_NOTICE', 'EXITED']);
  });

  it('has a literal key for every event kind', () => {
    for (const kind of HR_EVENT_KINDS) expect(HR_EVENT_KIND_KEYS[kind]).toBe(`hrEmployee.event.${kind}`);
  });
});

describe('translation key maps', () => {
  // Each map is built from its keys alone, so this is what proves no value was left without one.
  const maps: [string, readonly string[], Readonly<Record<string, string>>][] = [
    ['status', HR_EMPLOYEE_STATUSES, HR_EMPLOYEE_STATUS_KEYS],
    ['employmentType', HR_EMPLOYMENT_TYPES, HR_EMPLOYMENT_TYPE_KEYS],
    ['gender', HR_GENDERS, HR_GENDER_KEYS],
    ['exitType', HR_EXIT_TYPES, HR_EXIT_TYPE_KEYS],
    ['jobReason', HR_JOB_CHANGE_REASONS, HR_JOB_CHANGE_REASON_KEYS],
    ['payType', HR_PAY_COMPONENT_TYPES, HR_PAY_TYPE_KEYS],
    ['payReason', ['HIRE', ...HR_REVISION_REASONS], HR_COMPENSATION_REASON_KEYS],
    ['templateCalc', HR_TEMPLATE_CALCS, HR_TEMPLATE_CALC_KEYS],
    ['event', HR_EVENT_KINDS, HR_EVENT_KIND_KEYS],
  ];

  it.each(maps)('maps every %s value, and nothing else, to hrEmployee.<group>.<value>', (group, values, keys) => {
    expect(Object.keys(keys).sort()).toEqual([...values].sort());
    for (const value of values) expect(keys[value]).toBe(`hrEmployee.${group}.${value}`);
  });
});

describe('status rules (twins of the server)', () => {
  it('offers each action only in the states the server allows it', () => {
    expect(HR_EMPLOYEE_STATUSES.map(canScheduleHrExit)).toEqual([true, true, false]);
    expect(HR_EMPLOYEE_STATUSES.map(canCancelHrExit)).toEqual([false, true, false]);
    expect(HR_EMPLOYEE_STATUSES.map(canRehireHrEmployee)).toEqual([false, false, true]);
    expect(HR_EMPLOYEE_STATUSES.map(isHrRecordEditable)).toEqual([true, true, false]);
  });
});
