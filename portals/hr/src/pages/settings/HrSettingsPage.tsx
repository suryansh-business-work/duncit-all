import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { HR_SETTINGS, UPDATE_HR_SETTINGS, type SettingsData, type UpdateSettingsData, type UpdateSettingsVars } from '../../lib/settings-queries';
import { useHrWrite } from '../../lib/useHrWrite';
import { HrSettingsForm, type HrSettingsOutput } from './hr-settings-form';

/** HR > Settings. */
export default function HrSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<SettingsData>(HR_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save] = useMutation<UpdateSettingsData, UpdateSettingsVars>(UPDATE_HR_SETTINGS, { refetchQueries: [HR_SETTINGS] });
  const write = useHrWrite();

  const submit = async (input: HrSettingsOutput) =>
    (await write('updateHrSettings', async () => (await save({ variables: { input } })).data?.updateHrSettings, 'hrEmployee.settings.saved')) !== null;

  return (
    <Stack spacing={3}>
      <PageHeader title={t('hrEmployee.settings.title')} subtitle={t('hrEmployee.settings.subtitle')} />
      <QueryGuard loading={loading && !data} error={data ? undefined : error} errorText={t('hrEmployee.settings.loadFailed')}>
        {data && <HrSettingsForm settings={data.hrSettings} onSubmit={submit} />}
      </QueryGuard>
    </Stack>
  );
}
