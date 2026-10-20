import type { ReactNode } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Card, CardContent, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PageHeader, QueryGuard } from '@duncit/ui';
import { runAction } from '../../lib/actions';
import { SAVE_SETTINGS, STORE_SETTINGS } from '../settings/queries';
import SettingsTabForm from '../settings/settings-form';
import { HEADER_FOOTER_SPEC } from './header-footer-form';

/** The Header & footer tab: the parts of the store every page wears, saved with the store settings. */
export default function HeaderFooterPanel({ tabs }: Readonly<{ tabs: ReactNode }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery(STORE_SETTINGS, { fetchPolicy: 'cache-and-network' });
  const [save, saveState] = useMutation(SAVE_SETTINGS, { refetchQueries: ['StoreAdminSettings'] });
  const settings = data?.storeAdminSettings;
  const onSave = (input: Record<string, unknown>) =>
    runAction(() => save({ variables: { input } }), t('ecommPortal.common.saved'));
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.sections')} subtitle={t('ecommPortal.sections.headerFooterSubtitle')} />
      {tabs}
      <QueryGuard loading={loading && !settings} error={error}>
        {() =>
          settings && (
            <Card variant="outlined">
              <CardContent>
                <SettingsTabForm spec={HEADER_FOOTER_SPEC} settings={settings} saving={saveState.loading} onSave={onSave} />
              </CardContent>
            </Card>
          )
        }
      </QueryGuard>
    </Stack>
  );
}
