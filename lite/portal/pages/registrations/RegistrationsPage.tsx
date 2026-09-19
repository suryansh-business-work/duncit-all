import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_ADMIN_REGISTRATIONS_TABLE, type LiteAdminRegistrationRow } from '../../graphql/registrations';
import { buildRegistrationColumns, registrationRowId } from './columns';

/** Read-only: the host acts on a registration from the app; the admin only looks. */
export function RegistrationsPage() {
  const { t } = usePortalT();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<LiteAdminRegistrationRow>(client, LITE_ADMIN_REGISTRATIONS_TABLE, 'liteAdminRegistrationsTable');
  const columns = useMemo(() => buildRegistrationColumns(t), [t]);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.registrations.title')} subtitle={t('litePortal.registrations.subtitle')} />
      <DuncitTable<LiteAdminRegistrationRow>
        tableId="lite-registrations"
        ariaLabel={t('litePortal.registrations.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={registrationRowId}
        emptyText={t('litePortal.registrations.empty')}
        searchPlaceholder={t('litePortal.registrations.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />
    </Stack>
  );
}
