import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Stack } from '@mui/material';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import { usePortalT } from '../../../shared/i18n';
import { LITE_EMAIL_LOGS_TABLE, type LiteEmailLogRow } from '../../graphql/email';
import { buildEmailLogColumns, emailLogRowId } from './columns';
import { EmailLogDrawer } from './EmailLogDrawer';

export function EmailLogsPage() {
  const { t } = usePortalT();
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<LiteEmailLogRow>(client, LITE_EMAIL_LOGS_TABLE, 'liteEmailLogsTable');
  const columns = useMemo(() => buildEmailLogColumns(t), [t]);
  const [open, setOpen] = useState<LiteEmailLogRow | null>(null);

  return (
    <Stack spacing={2}>
      <PageHeader title={t('litePortal.emailLogs.title')} subtitle={t('litePortal.emailLogs.subtitle')} />
      <DuncitTable<LiteEmailLogRow>
        tableId="lite-email-logs"
        ariaLabel={t('litePortal.emailLogs.title')}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={emailLogRowId}
        onRowClick={setOpen}
        emptyText={t('litePortal.emailLogs.empty')}
        searchPlaceholder={t('litePortal.emailLogs.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
      />
      <EmailLogDrawer log={open} onClose={() => setOpen(null)} />
    </Stack>
  );
}
