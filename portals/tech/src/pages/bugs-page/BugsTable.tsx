import { useMemo, type MutableRefObject } from 'react';
import { Button, Chip, Typography } from '@mui/material';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { STATUS_OPTIONS, statusColor, type BugRow } from './queries';

const getBugRowId = (b: BugRow) => b.id;

const renderStatus = (b: BugRow) => (
  <Chip size="small" label={b.status} color={statusColor(b.status)} />
);

const renderTitle = (b: BugRow) => (
  <Typography variant="body2" fontWeight={600} noWrap title={b.title}>
    {b.title}
  </Typography>
);

const renderLastSeen = (b: BugRow) => (
  <Typography variant="body2" color="text.secondary">
    {new Date(b.last_seen_at).toLocaleString()}
  </Typography>
);

interface Props {
  fetchRows: TableFetch<BugRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (b: BugRow) => void;
}

export default function BugsTable({ fetchRows, refetchRef, onOpen }: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<BugRow>[]>(() => {
    const renderActions = (b: BugRow) => (
      <Button size="small" variant="outlined" onClick={() => onOpen(b)}>
        Triage
      </Button>
    );
    return [
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
      },
      { field: 'title', headerName: 'Bug', flex: 1.6, minWidth: 240, cellRenderer: renderTitle },
      { field: 'source', headerName: 'Source', width: 150, filter: { type: 'text' } },
      { field: 'page', headerName: 'Page', flex: 1, minWidth: 160, filter: { type: 'text' } },
      { field: 'occurrence_count', headerName: 'Count', width: 100 },
      { field: 'last_seen_at', headerName: 'Last seen', width: 190, cellRenderer: renderLastSeen },
      {
        field: 'actions',
        headerName: '',
        width: 120,
        sortable: false,
        cellRenderer: renderActions,
      },
    ];
  }, [onOpen]);

  return (
    <DuncitTable<BugRow>
      tableId="tech-bugs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBugRowId}
      emptyText="No bugs yet — error logs roll up here as they arrive."
      defaultSort={{ field: 'last_seen_at', dir: 'desc' }}
      searchPlaceholder="Search title, message, page or source"
      refetchRef={refetchRef}
    />
  );
}
