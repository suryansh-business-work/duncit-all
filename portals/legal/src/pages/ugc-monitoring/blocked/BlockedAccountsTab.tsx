import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Chip } from '@mui/material';
import { DuncitTable, dateColumn, useApolloTableFetch, type DuncitColumn } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { USER_BLOCKS_TABLE, type UserBlockRow } from '../../../graphql/blocks';

const getRowId = (r: UserBlockRow) => r.id;

/**
 * UGC Monitoring > Blocked accounts — every block members have made from a
 * profile, newest first.
 *
 * Read-only on purpose: a block is the member's own decision about who reaches
 * them, and Legal does not lift it for them. What Legal needs is the record —
 * who blocked whom and when — beside the reports, because a block and a
 * profile report about the same account are usually one story. An unblock
 * keeps its row, marked Unblocked, so that history survives it.
 */
export default function BlockedAccountsTab() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const fetchRows = useApolloTableFetch<UserBlockRow>(client, USER_BLOCKS_TABLE, 'userBlocksTable');

  const columns = useMemo<DuncitColumn<UserBlockRow>[]>(() => {
    const renderStatus = (r: UserBlockRow) => (
      <Chip
        size="small"
        variant={r.active ? 'filled' : 'outlined'}
        color={r.active ? 'warning' : 'default'}
        label={t(r.active ? 'reportLogs.blockActive' : 'reportLogs.blockLifted')}
      />
    );
    // Names are resolved per row from the stored user ids: nothing to sort or filter on.
    return [
      {
        field: 'blocker_name',
        headerName: t('reportLogs.blockColBlocker'),
        flex: 1,
        minWidth: 180,
        type: 'text',
        sortable: false,
        filterable: false,
      },
      {
        field: 'blocked_name',
        headerName: t('reportLogs.blockColBlocked'),
        flex: 1,
        minWidth: 180,
        type: 'text',
        sortable: false,
        filterable: false,
      },
      {
        field: 'active',
        headerName: t('reportLogs.blockColStatus'),
        width: 140,
        type: 'text',
        sortable: false,
        filterable: false,
        cellRenderer: renderStatus,
        valueGetter: (r) => t(r.active ? 'reportLogs.blockActive' : 'reportLogs.blockLifted'),
      },
      dateColumn<UserBlockRow>({
        field: 'blocked_at',
        headerName: t('reportLogs.blockColBlockedAt'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      dateColumn<UserBlockRow>({
        field: 'unblocked_at',
        headerName: t('reportLogs.blockColUnblockedAt'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
    ];
  }, [formatDateTime, t]);

  return (
    <DuncitTable<UserBlockRow>
      tableId="legal-ugc-blocks"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('reportLogs.blocksEmpty')}
      defaultSort={{ field: 'blocked_at', dir: 'desc' }}
      searchPlaceholder={t('reportLogs.blocksSearch')}
    />
  );
}
