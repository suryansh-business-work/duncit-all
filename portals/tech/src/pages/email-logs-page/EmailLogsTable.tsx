import { useMemo, type MutableRefObject } from 'react';
import { Box, Chip, Tooltip, Typography } from '@mui/material';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  CATEGORY_OPTIONS,
  SOURCE_OPTIONS,
  STATUS_COLOR,
  STATUS_OPTIONS,
  type EmailLogRow,
} from './queries';

interface Props {
  fetchRows: TableFetch<EmailLogRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
}

const getRowId = (row: EmailLogRow) => row.id;

const renderStatus = (row: EmailLogRow) => (
  <Chip size="small" label={row.status} color={STATUS_COLOR[row.status] ?? 'default'} />
);

const renderTo = (row: EmailLogRow) => (
  <Box>
    <Typography variant="body2" noWrap title={row.to}>
      {row.to || '—'}
    </Typography>
    <Typography variant="caption" color="text.secondary" noWrap title={row.subject}>
      {row.subject || '—'}
    </Typography>
  </Box>
);

/**
 * The reason is the column this page exists for. It is blank on a success and
 * carries the whole answer on anything else, so it is given room and shown in
 * full on hover rather than being cut to a chip.
 */
const renderReason = (row: EmailLogRow) => {
  if (!row.reason) return <Typography variant="body2" color="text.secondary">—</Typography>;
  return (
    <Tooltip title={row.reason}>
      <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.35 }}>
        {row.reason}
      </Typography>
    </Tooltip>
  );
};

const renderTemplate = (row: EmailLogRow) => (
  <Box>
    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
      {row.template || '—'}
    </Typography>
    {row.fragment_key && (
      <Typography variant="caption" color="text.secondary">
        + {row.fragment_key}
      </Typography>
    )}
  </Box>
);

const renderSource = (row: EmailLogRow) => (
  <Tooltip title={row.source_detail || row.source}>
    <Chip size="small" variant="outlined" label={row.source} />
  </Tooltip>
);

export default function EmailLogsTable({ fetchRows, refetchRef }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<EmailLogRow>[]>(
    () => [
      dateColumn<EmailLogRow>({
        field: 'created_at',
        headerName: 'When',
        width: 165,
        formatDate: (d) => d.toLocaleString(),
      }),
      {
        field: 'status',
        headerName: 'Status',
        width: 110,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (row) => row.status,
      },
      {
        field: 'to',
        headerName: 'To',
        flex: 1,
        minWidth: 220,
        filter: { type: 'text' },
        cellRenderer: renderTo,
        valueGetter: (row) => row.to || '—',
      },
      {
        field: 'reason',
        headerName: 'Reason',
        sortable: false,
        minWidth: 240,
        cellRenderer: renderReason,
        valueGetter: (row) => row.reason || '—',
      },
      {
        field: 'template',
        headerName: 'Template',
        minWidth: 170,
        filter: { type: 'text' },
        cellRenderer: renderTemplate,
        valueGetter: (row) => row.template || '—',
      },
      {
        field: 'category',
        headerName: 'Category',
        width: 140,
        filter: { type: 'select', options: CATEGORY_OPTIONS },
        valueGetter: (row) => row.category,
      },
      {
        field: 'source',
        headerName: 'Source',
        width: 115,
        filter: { type: 'select', options: SOURCE_OPTIONS },
        cellRenderer: renderSource,
        valueGetter: (row) => row.source,
      },
      {
        field: 'provider',
        headerName: 'Provider',
        width: 110,
        filter: { type: 'text' },
        valueGetter: (row) => row.provider || '—',
      },
      {
        field: 'duration_ms',
        headerName: 'Took',
        width: 95,
        filter: { type: 'number' },
        valueGetter: (row) => `${row.duration_ms} ms`,
      },
      {
        field: 'message_id',
        headerName: 'Message ID',
        hide: true,
        minWidth: 220,
        valueGetter: (row) => row.message_id || '—',
      },
    ],
    []
  );

  return (
    <DuncitTable<EmailLogRow>
      tableId="tech-email-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText="No emails yet."
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder="Search recipient, subject, template or reason"
      refetchRef={refetchRef}
    />
  );
}
