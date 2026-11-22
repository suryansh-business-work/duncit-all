import { useCallback, useRef } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';
import { firstGraphQLError, formatMonthKey, type EmployeeTargetRecord } from '@duncit/utils';
import {
  ASSIGN_EMPLOYEE_TARGET,
  DELETE_EMPLOYEE_TARGET,
  REOPEN_EMPLOYEE_TARGET,
  REVIEW_EMPLOYEE_TARGET,
  UPDATE_EMPLOYEE_TARGET,
  type AssignTargetData,
  type AssignTargetVars,
  type ReopenTargetData,
  type ReopenTargetVars,
  type ReviewTargetData,
  type ReviewTargetVars,
  type UpdateTargetData,
  type UpdateTargetVars,
} from '../../lib/employee-target-queries';
import type { AssignTargetOutput } from './assign-target';

type Attempt = { key: string; id: string } | null;

/** The request id for this attempt: the same while the payload is the same, new once it changes. */
function requestIdFor(attempt: { current: Attempt }, key: string): string {
  if (attempt.current?.key !== key) attempt.current = { key, id: crypto.randomUUID() };
  return attempt.current.id;
}

/**
 * Every write on the Employee Targets page. Assign carries one request id per
 * attempt, so a double click or a retried request returns the first record;
 * every other write names the revision it was made against, and one that lost
 * a race (CONFLICT) or hit a lock (BAD_REQUEST) says so instead of failing
 * silently. Each resolves to the updated record, or null when nothing changed.
 */
export function useEmployeeTargetActions(refetch: () => void) {
  const { t, locale } = useTranslation();
  const confirm = useConfirm();
  const attempt = useRef<Attempt>(null);
  const [assignMutation] = useMutation<AssignTargetData, AssignTargetVars>(ASSIGN_EMPLOYEE_TARGET);
  const [updateMutation] = useMutation<UpdateTargetData, UpdateTargetVars>(UPDATE_EMPLOYEE_TARGET);
  const [reviewMutation] = useMutation<ReviewTargetData, ReviewTargetVars>(REVIEW_EMPLOYEE_TARGET);
  const [reopenMutation] = useMutation<ReopenTargetData, ReopenTargetVars>(REOPEN_EMPLOYEE_TARGET);
  const [deleteMutation] = useMutation<{ deleteEmployeeTarget: boolean }, { id: string }>(DELETE_EMPLOYEE_TARGET);

  const failed = useCallback(
    (action: string, error: unknown, conflictKey: string) => {
      const code = firstGraphQLError(error)?.extensions?.code;
      logs.portal.targets.error('useEmployeeTargetActions', action, { error, code });
      if (code === 'CONFLICT') notifyError(t(conflictKey));
      else if (code === 'BAD_REQUEST') notifyError(t('employeeTargets.admin.locked'));
      else notifyError(t('employeeTargets.admin.failed'));
      return null;
    },
    [t]
  );

  const run = useCallback(
    async <T>(action: string, write: () => Promise<T | null | undefined>, successKey: string, conflictKey = 'employeeTargets.admin.conflict') => {
      try {
        const result = await write();
        notifySuccess(t(successKey));
        refetch();
        return result ?? null;
      } catch (error) {
        return failed(action, error, conflictKey);
      }
    },
    [failed, refetch, t]
  );

  const assign = useCallback(
    (values: AssignTargetOutput) =>
      run(
        'assign',
        async () => {
          const client_request_id = requestIdFor(attempt, JSON.stringify(values));
          const { data } = await assignMutation({ variables: { input: { ...values, client_request_id } } });
          attempt.current = null;
          return data?.assignEmployeeTarget;
        },
        'employeeTargets.admin.assigned',
        'employeeTargets.admin.duplicate'
      ),
    [assignMutation, run]
  );

  const update = useCallback(
    (target: EmployeeTargetRecord, values: AssignTargetOutput) =>
      run(
        'update',
        async () => {
          const input = { goals: values.goals, notes: values.notes, expected_revision: target.revision };
          const { data } = await updateMutation({ variables: { id: target.id, input } });
          return data?.updateEmployeeTarget;
        },
        'employeeTargets.admin.updated'
      ),
    [run, updateMutation]
  );

  const review = useCallback(
    (target: EmployeeTargetRecord, comment: string) =>
      run(
        'review',
        async () => {
          const input = { comment, expected_revision: target.revision };
          const { data } = await reviewMutation({ variables: { id: target.id, input } });
          return data?.reviewEmployeeTarget;
        },
        'employeeTargets.review.done'
      ),
    [reviewMutation, run]
  );

  const describe = useCallback(
    (target: EmployeeTargetRecord) => ({ name: target.employee.name, month: formatMonthKey(target.month, locale) }),
    [locale]
  );

  const reopen = useCallback(
    async (target: EmployeeTargetRecord) => {
      const ok = await confirm({
        title: t('employeeTargets.admin.reopenTitle'),
        message: t('employeeTargets.admin.reopenMessage', { vars: describe(target) }),
        confirmLabel: t('employeeTargets.admin.reopen'),
      });
      if (!ok) return null;
      return run(
        'reopen',
        async () => {
          const { data } = await reopenMutation({ variables: { id: target.id, expectedRevision: target.revision } });
          return data?.reopenEmployeeTarget;
        },
        'employeeTargets.admin.reopened'
      );
    },
    [confirm, describe, reopenMutation, run, t]
  );

  const remove = useCallback(
    async (target: EmployeeTargetRecord) => {
      const ok = await confirm({
        title: t('employeeTargets.admin.deleteTitle'),
        message: t('employeeTargets.admin.deleteMessage', { vars: describe(target) }),
        confirmLabel: t('employeeTargets.admin.delete'),
        destructive: true,
      });
      if (!ok) return false;
      const done = await run(
        'delete',
        async () => (await deleteMutation({ variables: { id: target.id } })).data?.deleteEmployeeTarget,
        'employeeTargets.admin.deleted'
      );
      return done === true;
    },
    [confirm, deleteMutation, describe, run, t]
  );

  return { assign, update, review, reopen, remove };
}
