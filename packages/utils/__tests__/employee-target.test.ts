import { describe, expect, it } from 'vitest';
import {
  EMPLOYEE_TARGET_SELECTION,
  EMPLOYEE_TARGET_STATUSES,
  EMPLOYEE_TARGET_STATUS_COLORS,
  EMPLOYEE_TARGET_STATUS_KEYS,
  canEditTargetGoals,
  canSubmitTarget,
  dateOfMonthKey,
  employeeTargetStatusOptions,
  formatMonthKey,
  monthKeyOf,
} from '../src/employee-target';

describe('employee target statuses', () => {
  it('gives every status a chip colour and a literal translation key', () => {
    for (const status of EMPLOYEE_TARGET_STATUSES) {
      expect(EMPLOYEE_TARGET_STATUS_COLORS[status]).toBeTruthy();
      expect(EMPLOYEE_TARGET_STATUS_KEYS[status]).toBe(`employeeTargets.status.${status}`);
    }
  });

  it('labels the status filter choices in status order, through the given translator', () => {
    const t = (key: string) => `[${key}]`;
    expect(employeeTargetStatusOptions(t)).toEqual([
      { value: 'ASSIGNED', label: '[employeeTargets.status.ASSIGNED]' },
      { value: 'SUBMITTED', label: '[employeeTargets.status.SUBMITTED]' },
      { value: 'REVIEWED', label: '[employeeTargets.status.REVIEWED]' },
    ]);
  });

  it('locks goals once progress is reported and the report once it is reviewed', () => {
    expect(EMPLOYEE_TARGET_STATUSES.map(canEditTargetGoals)).toEqual([true, false, false]);
    expect(EMPLOYEE_TARGET_STATUSES.map(canSubmitTarget)).toEqual([true, true, false]);
  });
});

describe('the shared selection', () => {
  it('asks for the fields the review and reminder banner read', () => {
    for (const field of ['completion_percent', 'achievements', 'reminder_active', 'revision', 'review', 'goal_count']) {
      expect(EMPLOYEE_TARGET_SELECTION).toContain(field);
    }
  });
});

describe('month keys', () => {
  it('turns a picked date into its calendar month, padding single digits', () => {
    expect(monthKeyOf(new Date(2026, 10, 18))).toBe('2026-11');
    expect(monthKeyOf(new Date(2027, 0, 31))).toBe('2027-01');
  });

  it('turns a key back into the first of that month, and refuses junk', () => {
    expect(dateOfMonthKey('2026-11')).toEqual(new Date(2026, 10, 1));
    for (const bad of ['', null, undefined, '2026-1', '2026/11', '2026-13', '2026-00', 'abcd-ef']) {
      expect(dateOfMonthKey(bad)).toBeNull();
    }
  });

  it('round-trips through the picker', () => {
    const date = dateOfMonthKey('2028-02');
    expect(date && monthKeyOf(date)).toBe('2028-02');
  });

  it('names a month in the given locale and shows an unreadable key as it is', () => {
    expect(formatMonthKey('2026-11', 'en-US')).toBe('November 2026');
    expect(formatMonthKey('2026-13', 'en-US')).toBe('2026-13');
    expect(formatMonthKey('2026-11')).toContain('2026');
  });
});
