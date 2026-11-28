import { describe, expect, it } from 'vitest';
import {
  HR_BLOCKING_ISSUES,
  HR_PAYROLL_ISSUES,
  HR_PAYROLL_ISSUE_KEYS,
  HR_PAYROLL_EVENT_ACTIONS,
  HR_PAYROLL_EVENT_KEYS,
  HR_PAYROLL_RUN_STATUSES,
  PAYSLIP_STATUSES,
  PAYSLIP_STATUS_KEYS,
  canEditHrPayrollRun,
  canReleaseHrPayrollRun,
  hrIssueColor,
  hrPayrollEventKey,
  shiftMonthKey,
} from '../src';

describe('month keys', () => {
  it('moves across year boundaries both ways and leaves anything else alone', () => {
    expect(shiftMonthKey('2026-12', 1)).toBe('2027-01');
    expect(shiftMonthKey('2026-01', -1)).toBe('2025-12');
    expect(shiftMonthKey('2026-06', 0)).toBe('2026-06');
    expect(shiftMonthKey('June', 1)).toBe('June');
  });

});

describe('payroll words and colours', () => {
  it('colours blocking issues red and the informational ones amber', () => {
    expect(HR_PAYROLL_ISSUES.filter((issue) => hrIssueColor(issue) === 'error')).toEqual([...HR_BLOCKING_ISSUES]);
    expect(hrIssueColor('PENDING_LEAVE')).toBe('warning');
  });

  it('has a translation key for every issue and payslip status', () => {
    expect(HR_PAYROLL_ISSUES.map((issue) => HR_PAYROLL_ISSUE_KEYS[issue])).toEqual(HR_PAYROLL_ISSUES.map((issue) => `hrShared.issue.${issue}`));
    expect(PAYSLIP_STATUSES.map((status) => PAYSLIP_STATUS_KEYS[status])).toEqual(PAYSLIP_STATUSES.map((status) => `hrShared.payslipStatus.${status}`));
  });

  it('labels every payroll history step, and gives no key for a step this build does not know', () => {
    expect(HR_PAYROLL_EVENT_ACTIONS.map((action) => HR_PAYROLL_EVENT_KEYS[action])).toEqual(HR_PAYROLL_EVENT_ACTIONS.map((action) => `hrShared.payrollEvent.${action}`));
    expect(hrPayrollEventKey('RELEASED')).toBe('hrShared.payrollEvent.RELEASED');
    expect(hrPayrollEventKey('ARCHIVED')).toBeNull();
  });

  it('lets HR edit only a draft and Finance release only an approved run', () => {
    expect(HR_PAYROLL_RUN_STATUSES.map(canEditHrPayrollRun)).toEqual([true, false, false, false]);
    expect(HR_PAYROLL_RUN_STATUSES.map(canReleaseHrPayrollRun)).toEqual([false, true, false, false]);
  });
});
