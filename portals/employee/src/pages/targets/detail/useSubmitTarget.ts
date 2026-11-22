import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { firstGraphQLError, type EmployeeTargetRecord } from '@duncit/utils';
import { MY_DUE_EMPLOYEE_TARGETS, SUBMIT_EMPLOYEE_TARGET, type SubmitTargetData, type SubmitTargetVars } from '../queries';
import type { SubmitTargetFormValues } from '../submit-target';

/**
 * Files (or corrects) the month's report against the revision the employee
 * loaded. A report that lost a race with a review or another tab (CONFLICT),
 * or a month reviewed meanwhile (BAD_REQUEST), says so and reloads the month
 * instead of overwriting it. The reminder banner is refreshed with it.
 */
export function useSubmitTarget(target: EmployeeTargetRecord | undefined, reload: () => void) {
  const { t } = useTranslation();
  const [submit] = useMutation<SubmitTargetData, SubmitTargetVars>(SUBMIT_EMPLOYEE_TARGET, {
    refetchQueries: [{ query: MY_DUE_EMPLOYEE_TARGETS }],
  });

  return useCallback(
    async (values: SubmitTargetFormValues): Promise<boolean> => {
      if (!target) return false;
      try {
        await submit({ variables: { id: target.id, input: { ...values, expected_revision: target.revision } } });
        notifySuccess(t('employeeTargets.mine.submitted'));
        return true;
      } catch (error) {
        const code = firstGraphQLError(error)?.extensions?.code;
        logs.portal.employee.error('useSubmitTarget', 'submit', { error, code, id: target.id });
        if (code === 'CONFLICT') notifyError(t('employeeTargets.mine.conflict'));
        else if (code === 'BAD_REQUEST') notifyError(t('employeeTargets.mine.locked'));
        else notifyError(t('employeeTargets.mine.failed'));
        if (code === 'CONFLICT' || code === 'BAD_REQUEST') reload();
        return false;
      }
    },
    [reload, submit, t, target]
  );
}
