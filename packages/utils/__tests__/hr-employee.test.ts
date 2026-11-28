import { describe, expect, it } from 'vitest';
import {
  HR_EMPLOYEE_STATUSES,
  HR_EMPLOYEE_STATUS_KEYS,
  HR_EVENT_KINDS,
  HR_EVENT_KIND_KEYS,
  HR_EMPLOYMENT_TYPES,
  HR_EMPLOYMENT_TYPE_KEYS,
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

describe('status rules (twins of the server)', () => {
  it('offers each action only in the states the server allows it', () => {
    expect(HR_EMPLOYEE_STATUSES.map(canScheduleHrExit)).toEqual([true, true, false]);
    expect(HR_EMPLOYEE_STATUSES.map(canCancelHrExit)).toEqual([false, true, false]);
    expect(HR_EMPLOYEE_STATUSES.map(canRehireHrEmployee)).toEqual([false, false, true]);
    expect(HR_EMPLOYEE_STATUSES.map(isHrRecordEditable)).toEqual([true, true, false]);
  });
});
