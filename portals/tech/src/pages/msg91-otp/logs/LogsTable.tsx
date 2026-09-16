import { useMemo } from 'react';
import { Typography } from '@mui/material';
import { DuncitTable, clientTableFetch, dateColumn, type DuncitColumn } from '@duncit/table';
import { formatDateTime, useTranslation } from '@duncit/app-settings';
import type { Msg91WidgetLog } from '../queries';
import YesNoChip from '../YesNoChip';
import { channelLabels, channelSummary } from '../channels';

const getRowId = (row: Msg91WidgetLog) => row.request_id;
const searchOf = (row: Msg91WidgetLog) => `${row.identifier} ${row.request_id} ${row.user_ip}`;

const renderMono = (value: string) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace' }} noWrap title={value}>
    {value}
  </Typography>
);
const renderRequestId = (row: Msg91WidgetLog) => renderMono(row.request_id);
const renderVerified = (row: Msg91WidgetLog) => <YesNoChip value={row.verified} />;
const renderTokenVerified = (row: Msg91WidgetLog) => <YesNoChip value={row.token_verified} />;

/** Every widget request in the window, searched and sorted in the browser. */
export default function LogsTable({ rows }: Readonly<{ rows: readonly Msg91WidgetLog[] }>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<Msg91WidgetLog>[]>(() => {
    const channels = channelLabels(t);
    return [
      dateColumn<Msg91WidgetLog>({
        field: 'requested_at',
        headerName: t('tech.msg91.colRequestedAt'),
        hide: false,
        width: 190,
        formatDate: formatDateTime,
      }),
      { field: 'identifier', headerName: t('tech.msg91.colNumber'), width: 150, type: 'text', valueGetter: (row) => row.identifier },
      { field: 'verified', headerName: t('tech.msg91.colVerified'), width: 110, type: 'boolean', cellRenderer: renderVerified, valueGetter: (row) => row.verified },
      {
        field: 'token_verified',
        headerName: t('tech.msg91.colTokenVerified'),
        width: 140,
        type: 'boolean',
        cellRenderer: renderTokenVerified,
        valueGetter: (row) => row.token_verified,
      },
      { field: 'verify_attempts', headerName: t('tech.msg91.colVerifyAttempts'), width: 120, type: 'number', valueGetter: (row) => row.verify_attempts },
      { field: 'retries', headerName: t('tech.msg91.colRetries'), width: 100, type: 'number', valueGetter: (row) => row.retries },
      {
        field: 'channels',
        headerName: t('tech.msg91.colChannels'),
        minWidth: 170,
        flex: 1,
        type: 'text',
        sortable: false,
        valueGetter: (row) => channelSummary(row, channels),
      },
      {
        field: 'request_id',
        headerName: t('tech.msg91.colRequestId'),
        width: 230,
        type: 'text',
        cellRenderer: renderRequestId,
        valueGetter: (row) => row.request_id,
      },
      { field: 'user_ip', headerName: t('tech.common.ipAddress'), width: 180, type: 'text', valueGetter: (row) => row.user_ip },
    ];
  }, [t]);
  const fetchRows = useMemo(() => clientTableFetch<Msg91WidgetLog>(rows, searchOf, columns), [rows, columns]);

  return (
    <DuncitTable<Msg91WidgetLog>
      tableId="tech-msg91-otp-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('tech.msg91.noLogs')}
      defaultSort={{ field: 'requested_at', dir: 'desc' }}
      searchPlaceholder={t('tech.msg91.searchLogs')}
    />
  );
}
