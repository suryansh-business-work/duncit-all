import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import type { HrEmployeeRecord } from '@duncit/utils';
import {
  ADD_HR_COMPENSATION,
  CANCEL_HR_EXIT,
  CHANGE_HR_JOB,
  HR_EMPLOYEES_TABLE,
  HR_EMPLOYEE_HISTORY,
  HR_EMPLOYEE_PROFILE,
  REHIRE_HR_EMPLOYEE,
  REMOVE_HR_COMPENSATION,
  RESTORE_HR_ACCESS,
  SCHEDULE_HR_EXIT,
  UPDATE_HR_BANK,
  UPDATE_HR_PERSONAL,
  type BankVars,
  type CompensationVars,
  type ExitVars,
  type JobVars,
  type PersonalVars,
  type RehireVars,
} from '../../../lib/employee-queries';
import { useHrWrite } from '../../../lib/useHrWrite';
import type { PersonalOutput } from './dialogs/personal-form';
import type { BankOutput } from './dialogs/bank-form';
import type { PayOutput } from './dialogs/pay-form';
import type { JobChangeOutput } from './dialogs/job-change-form';
import type { ExitOutput } from './dialogs/exit-form';
import type { RehireOutput } from './dialogs/rehire-form';

/**
 * Every write on an employee's profile. Each names the revision it was made
 * against, so a save that lost a race to another HR tab says so instead of
 * overwriting; each refreshes the profile, its history and the directory.
 * Every action resolves true once it saved.
 */
export function useProfileActions(employee: HrEmployeeRecord | null) {
  const write = useHrWrite();
  const refetchQueries = [HR_EMPLOYEE_PROFILE, HR_EMPLOYEE_HISTORY, HR_EMPLOYEES_TABLE];
  const options = { refetchQueries, awaitRefetchQueries: true };
  const [personalMutation] = useMutation<unknown, PersonalVars>(UPDATE_HR_PERSONAL, options);
  const [jobMutation] = useMutation<unknown, JobVars>(CHANGE_HR_JOB, options);
  const [payMutation] = useMutation<unknown, CompensationVars>(ADD_HR_COMPENSATION, options);
  const [removePayMutation] = useMutation<unknown, { id: string }>(REMOVE_HR_COMPENSATION, options);
  const [bankMutation] = useMutation<unknown, BankVars>(UPDATE_HR_BANK, options);
  const [exitMutation] = useMutation<unknown, ExitVars>(SCHEDULE_HR_EXIT, options);
  const [cancelExitMutation] = useMutation<unknown, { id: string; expectedRevision: number }>(CANCEL_HR_EXIT, options);
  const [rehireMutation] = useMutation<unknown, RehireVars>(REHIRE_HR_EMPLOYEE, options);
  const [restoreMutation] = useMutation<unknown, { id: string }>(RESTORE_HR_ACCESS, options);

  const id = employee?.id ?? '';
  const revision = employee?.revision ?? 0;
  const done = useCallback(
    async (action: string, run: () => Promise<unknown>, successKey: string) => (await write(action, async () => (await run()) ?? true, successKey)) !== null,
    [write]
  );

  return {
    updatePersonal: (input: PersonalOutput) =>
      done('updatePersonal', () => personalMutation({ variables: { id, input, expectedRevision: revision } }), 'hrEmployee.toast.saved'),
    changeJob: (input: JobChangeOutput) =>
      done('changeJob', () => jobMutation({ variables: { id, input: { ...input, expected_revision: revision } } }), 'hrEmployee.toast.saved'),
    addPay: (input: PayOutput) => done('addPay', () => payMutation({ variables: { employeeId: id, input } }), 'hrEmployee.toast.payAdded'),
    removePay: (compensationId: string) => done('removePay', () => removePayMutation({ variables: { id: compensationId } }), 'hrEmployee.toast.payWithdrawn'),
    updateBank: (input: BankOutput) =>
      done('updateBank', () => bankMutation({ variables: { id, input, expectedRevision: revision } }), 'hrEmployee.toast.saved'),
    scheduleExit: (input: ExitOutput) =>
      done('scheduleExit', () => exitMutation({ variables: { id, input: { ...input, expected_revision: revision } } }), 'hrEmployee.toast.exitRecorded'),
    cancelExit: () => done('cancelExit', () => cancelExitMutation({ variables: { id, expectedRevision: revision } }), 'hrEmployee.toast.exitCancelled'),
    rehire: (input: RehireOutput) =>
      done('rehire', () => rehireMutation({ variables: { id, input: { ...input, expected_revision: revision } } }), 'hrEmployee.toast.rehired'),
    restoreAccess: () => done('restoreAccess', () => restoreMutation({ variables: { id } }), 'hrEmployee.toast.accessRestored'),
  };
}

export type ProfileActions = ReturnType<typeof useProfileActions>;
