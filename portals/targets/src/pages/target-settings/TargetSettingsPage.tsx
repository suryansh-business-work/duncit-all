import { useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, CircularProgress, Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { logs } from '@duncit/logs';
import { PageHeader, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import {
  EMPLOYEE_TARGET_SETTINGS,
  UPDATE_EMPLOYEE_TARGET_SETTINGS,
  type SettingsData,
  type UpdateSettingsData,
  type UpdateSettingsVars,
} from '../../lib/employee-target-queries';
import { TargetSettingsForm, type TargetSettingsOutput } from './target-settings-form';

/** Targets > Settings: the month-end reminder window for employee targets. */
export default function TargetSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<SettingsData>(EMPLOYEE_TARGET_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation<UpdateSettingsData, UpdateSettingsVars>(UPDATE_EMPLOYEE_TARGET_SETTINGS);
  const settings = data?.employeeTargetSettings;
  const initial = useMemo<TargetSettingsOutput | null>(
    () =>
      settings
        ? {
            reminders_enabled: settings.reminders_enabled,
            reminder_days_before_end: settings.reminder_days_before_end,
            reminder_grace_days: settings.reminder_grace_days,
          }
        : null,
    [settings]
  );

  const submit = async (values: TargetSettingsOutput) => {
    try {
      await save({ variables: { input: values } });
      notifySuccess(t('employeeTargets.settings.saved'));
      return true;
    } catch (saveError) {
      logs.portal.targets.error('TargetSettingsPage', 'save', { error: saveError });
      notifyError(t('employeeTargets.settings.failed'));
      return false;
    }
  };

  const retry = () => {
    refetch().catch((retryError: unknown) => logs.portal.targets.warn('TargetSettingsPage', 'retry', { error: retryError }));
  };

  const body = () => {
    if (initial) return <TargetSettingsForm initial={initial} onSubmit={submit} />;
    if (error) {
      return (
        <Alert
          severity="error"
          data-testid="target-settings-error"
          action={
            <DuncitButton size="small" onClick={retry} data-testid="target-settings-retry">
              {t('employeeTargets.settings.retry')}
            </DuncitButton>
          }
        >
          {t('employeeTargets.settings.loadFailed')}
        </Alert>
      );
    }
    return loading ? <CircularProgress aria-label={t('employeeTargets.settings.loading')} /> : null;
  };

  return (
    <Stack spacing={3}>
      <PageHeader title={t('employeeTargets.settings.title')} subtitle={t('employeeTargets.settings.subtitle')} />
      <SectionCard title={t('employeeTargets.settings.remindersTitle')}>{body()}</SectionCard>
    </Stack>
  );
}
