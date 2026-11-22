import { useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { DuncitButton } from '@duncit/buttons';
import { PageHeader, SectionCard, StatusChip } from '@duncit/ui';
import { useTranslation } from '@duncit/app-settings';
import { logs } from '@duncit/logs';
import { EMPLOYEE_TARGET_STATUS_COLORS, EMPLOYEE_TARGET_STATUS_KEYS, canSubmitTarget, formatMonthKey } from '@duncit/utils';
import { MY_EMPLOYEE_TARGET, type MyTargetData } from '../queries';
import { SubmitTargetForm } from '../submit-target';
import TargetGoalsCard from './TargetGoalsCard';
import TargetReportView from './TargetReportView';
import { useSubmitTarget } from './useSubmitTarget';

/**
 * One month: its goals, the reviewer's comment once there is one, and the
 * progress report — a form until the month is reviewed, read-only after.
 */
export default function TargetDetailPage() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const { targetId } = useParams();
  const { data, loading, error, refetch } = useQuery<MyTargetData>(MY_EMPLOYEE_TARGET, {
    // The route only matches with an id, so it is always present here.
    variables: { id: String(targetId) },
    fetchPolicy: 'cache-and-network',
  });
  const target = data?.myEmployeeTarget;
  const reload = useCallback(() => {
    refetch().catch((reloadError: unknown) => logs.portal.employee.warn('TargetDetailPage', 'reload', { error: reloadError }));
  }, [refetch]);
  const submit = useSubmitTarget(target, reload);

  const back = (
    <DuncitButton startIcon={<ArrowBackIcon />} onClick={() => navigate('/targets')} data-testid="my-target-back">
      {t('employeeTargets.mine.backToList')}
    </DuncitButton>
  );

  if (!target) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
        {back}
        {loading ? (
          <CircularProgress aria-label={t('employeeTargets.mine.loading')} />
        ) : (
          <Alert severity={error ? 'error' : 'info'} data-testid="my-target-missing">
            {error ? t('employeeTargets.mine.loadFailed') : t('employeeTargets.mine.notFound')}
          </Alert>
        )}
      </Stack>
    );
  }

  const { review, submission } = target;
  const open = canSubmitTarget(target.status);

  return (
    <Stack spacing={2}>
      <PageHeader
        title={t('employeeTargets.mine.detailTitle', { vars: { month: formatMonthKey(target.month, locale) } })}
        subtitle={t('employeeTargets.detail.assignedByName', { vars: { name: target.assigned_by.name } })}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <StatusChip status={target.status} colorMap={EMPLOYEE_TARGET_STATUS_COLORS} label={t(EMPLOYEE_TARGET_STATUS_KEYS[target.status])} />
            {back}
          </Stack>
        }
      />
      {target.reminder_active && <Alert severity="warning">{t('employeeTargets.mine.dueHint')}</Alert>}
      <TargetGoalsCard goals={target.goals} notes={target.notes} />
      {review && (
        <Alert severity="success" data-testid="my-target-review">
          {t('employeeTargets.mine.reviewerComment', { vars: { name: review.reviewed_by.name } })}{' '}
          {review.comment || t('employeeTargets.review.noComment')}
        </Alert>
      )}
      {open && (
        <SectionCard title={submission ? t('employeeTargets.mine.resubmitTitle') : t('employeeTargets.mine.submitTitle')}>
          <SubmitTargetForm target={target} onSubmit={submit} />
        </SectionCard>
      )}
      {!open && <Alert severity="info">{t('employeeTargets.mine.lockedHint')}</Alert>}
      {!open && submission && <TargetReportView submission={submission} />}
    </Stack>
  );
}
