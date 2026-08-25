import { useMemo, type MutableRefObject } from 'react';
import { Avatar, Box, Chip, Tooltip, Typography } from '@mui/material';
import ImageNotSupportedIcon from '@mui/icons-material/ImageNotSupported';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import {
  ACTION_COLOR,
  ACTION_OPTIONS,
  RESULT_COLOR,
  RESULT_OPTIONS,
  STATUS_COLOR,
  STATUS_OPTIONS,
  SURFACE_OPTIONS,
  type MonitoringLogRow,
} from '../queries';

interface Props {
  fetchRows: TableFetch<MonitoringLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  /** Opens the row's drawer — the full comment and the trace behind it. */
  onRowClick: (row: MonitoringLogRow) => void;
}

const getRowId = (row: MonitoringLogRow) => row.id;

/** The image itself, next to the name it was uploaded under. */
const renderImage = (row: MonitoringLogRow) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
    <Avatar
      src={row.url}
      variant="rounded"
      alt=""
      sx={{ width: 36, height: 36, bgcolor: 'action.hover' }}
    >
      <ImageNotSupportedIcon fontSize="small" />
    </Avatar>
    <Typography variant="body2" noWrap title={row.file_name || row.url}>
      {row.file_name || row.url}
    </Typography>
  </Box>
);

const renderEntity = (row: MonitoringLogRow) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap>
      {row.entity ?? 'Signed-out upload'}
    </Typography>
    <Typography variant="caption" noWrap sx={{
      color: "text.secondary"
    }}>
      {row.user_id ?? 'no account attached'}
    </Typography>
  </Box>
);

const renderStatus = (row: MonitoringLogRow) => (
  <Chip size="small" label={row.status} color={STATUS_COLOR[row.status]} />
);

const renderResult = (row: MonitoringLogRow) => (
  <Chip size="small" variant="outlined" label={row.risk} color={RESULT_COLOR[row.risk]} />
);

const renderAction = (row: MonitoringLogRow) => (
  <Chip size="small" variant="outlined" label={row.action} color={ACTION_COLOR[row.action]} />
);

/** The model's comment, or — when it never got one — why not. */
const renderComment = (row: MonitoringLogRow) => {
  const text = row.summary || row.error || '—';
  return (
    <Tooltip title={row.error || text}>
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
        {text}
      </Typography>
    </Tooltip>
  );
};

/** Where the upload came from: the client family, then the folder it landed in. */
const renderSource = (row: MonitoringLogRow) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="body2" noWrap>
      {row.surface || '—'}
    </Typography>
    <Typography variant="caption" noWrap title={row.folder} sx={{
      color: "text.secondary"
    }}>
      {row.folder || '/'}
    </Typography>
  </Box>
);

export default function MonitoringLogsTable({ fetchRows, refetchRef, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<MonitoringLogRow>[]>(
    () => [
      {
        field: 'file_name',
        headerName: t('ai.monitoringLogs.colImage'),
        flex: 1.2,
        minWidth: 220,
        sortable: false,
        cellRenderer: renderImage,
        valueGetter: (row) => row.file_name || row.url,
      },
      {
        field: 'entity',
        headerName: t('ai.monitoringLogs.colUser'),
        minWidth: 180,
        sortable: false,
        cellRenderer: renderEntity,
        valueGetter: (row) => row.entity ?? '—',
      },
      dateColumn<MonitoringLogRow>({
        field: 'created_at',
        headerName: t('ai.monitoringLogs.colUploaded'),
        width: 165,
      }),
      {
        field: 'status',
        headerName: t('ai.monitoringLogs.colStatus'),
        width: 150,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'risk',
        headerName: t('ai.monitoringLogs.colResult'),
        width: 120,
        filter: { type: 'select', options: RESULT_OPTIONS },
        cellRenderer: renderResult,
        valueGetter: (row) => row.risk,
      },
      {
        field: 'summary',
        headerName: t('ai.monitoringLogs.colReason'),
        minWidth: 240,
        flex: 1.4,
        sortable: false,
        cellRenderer: renderComment,
        valueGetter: (row) => row.summary || row.error || '—',
      },
      {
        field: 'action',
        headerName: t('ai.monitoringLogs.colAction'),
        width: 140,
        filter: { type: 'select', options: ACTION_OPTIONS },
        cellRenderer: renderAction,
        valueGetter: (row) => row.action,
      },
      {
        field: 'surface',
        headerName: t('ai.monitoringLogs.colSource'),
        width: 160,
        filter: { type: 'select', options: SURFACE_OPTIONS },
        cellRenderer: renderSource,
        valueGetter: (row) => `${row.surface || '—'} ${row.folder || ''}`.trim(),
      },
    ],
    [t],
  );

  return (
    <DuncitTable<MonitoringLogRow>
      tableId="ai-monitoring-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('ai.monitoringLogs.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('ai.monitoringLogs.search')}
      refetchRef={refetchRef}
      onRowClick={onRowClick}
    />
  );
}
