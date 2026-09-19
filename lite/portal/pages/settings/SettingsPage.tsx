import { useCallback } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ADMIN_SETTINGS, LITE_ADMIN_UPDATE_SETTINGS, type LiteAdminSettings } from '../../graphql/admin';
import { useAction } from '../../hooks/useAction';
import { SettingsForm, toSettingsInput, type SettingsFormValues } from './settings';

export function SettingsPage() {
  const { t } = usePortalT();
  const { data, loading, error, refetch } = useQuery<{ liteAdminSettings: LiteAdminSettings }>(LITE_ADMIN_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const reload = useCallback(() => {
    refetch().catch(() => undefined);
  }, [refetch]);
  const run = useAction(reload);
  const [update, updateState] = useMutation(LITE_ADMIN_UPDATE_SETTINGS);
  const settings = data?.liteAdminSettings;

  const onSubmit = (values: SettingsFormValues) => run(() => update({ variables: { input: toSettingsInput(values) } }), t('litePortal.settings.saved'));

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.settings.title')} subtitle={t('litePortal.settings.subtitle')} />
      <QueryGuard loading={loading && !settings} error={error} loadingLabel={t('lite.common.loading')}>
        {() => (settings ? <SettingsForm initial={settings} busy={updateState.loading} onSubmit={onSubmit} /> : null)}
      </QueryGuard>
    </Stack>
  );
}
