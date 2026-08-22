import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Button, Chip, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { DuncitTable, type DuncitColumn, type TableFetch } from '@duncit/table';
import { UserCell } from '../../components/telemetry-identity';
import { STATUS_OPTIONS, affectedSummary, statusColor, type BugRow } from './queries';
import { formatDateTime } from '@duncit/app-settings';
import { useTranslation } from '@duncit/app-settings';

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
    {formatDateTime(b.last_seen_at)}
  </Typography>
);

/** The account behind the latest occurrence, or that there wasn't one. */
const renderLastUser = (b: BugRow) => <UserCell user={b.last_user} />;

/** `P 12 · S 3` — only the environments the bug actually hit. */
const envSummary = (b: BugRow) => {
  const parts: string[] = [];
  if (b.env_counts.production > 0) parts.push(`P ${b.env_counts.production}`);
  if (b.env_counts.staging > 0) parts.push(`S ${b.env_counts.staging}`);
  if (b.env_counts.localhost > 0) parts.push(`L ${b.env_counts.localhost}`);
  return parts.length > 0 ? parts.join(' · ') : '—';
};

interface Props {
  fetchRows: TableFetch<BugRow>;
  refetchRef: MutableRefObject<(() => void) | null>;
  onOpen: (b: BugRow) => void;
  onDelete: (b: BugRow) => void;
  /**
   * @duncit/table's selection contract: `onChange` is handed the rows ticked on
   * this page, and `clearRef` is filled with a "drop the ticks" fn. The whole
   * selection cell is out of the row-click handler, so ticking a row never also
   * opens the triage dialog.
   */
  selection: {
    onChange: (rows: BugRow[]) => void;
    clearRef: MutableRefObject<(() => void) | null>;
  };
  toolbarActions?: ReactNode;
}

export default function BugsTable({
  fetchRows,
  refetchRef,
  onOpen,
  onDelete,
  selection,
  toolbarActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<BugRow>[]>(() => {
    const renderActions = (b: BugRow) => (
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Button size="small" variant="outlined" onClick={() => onOpen(b)}>
          Triage
        </Button>
        <Tooltip title={t('tech.bugs.deleteThisBug2')}>
          <IconButton size="small" color="error" onClick={() => onDelete(b)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>
    );
    return [
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 120,
        filter: { type: 'select', options: STATUS_OPTIONS },
        cellRenderer: renderStatus,
      },
      { field: 'title', headerName: t('tech.bugs.bug'), flex: 1.6, minWidth: 240, cellRenderer: renderTitle },
      { field: 'source', headerName: t('tech.common.source'), width: 140, filter: { type: 'text' } },
      { field: 'page', headerName: t('tech.common.page'), flex: 1, minWidth: 150, filter: { type: 'text' } },
      { field: 'occurrence_count', headerName: t('tech.bugs.count'), width: 90 },
      {
        field: 'affected_user_count',
        headerName: t('tech.bugs.affected'),
        width: 140,
        valueGetter: affectedSummary,
      },
      {
        field: 'last_user',
        headerName: t('tech.bugs.lastUser'),
        width: 170,
        sortable: false,
        cellRenderer: renderLastUser,
      },
      {
        field: 'envs',
        headerName: t('tech.bugs.envs'),
        width: 120,
        sortable: false,
        valueGetter: envSummary,
      },
      {
        field: 'platform',
        headerName: t('tech.common.platform'),
        hide: true,
        width: 120,
        filter: { type: 'text' },
      },
      {
        field: 'first_seen_at',
        headerName: t('tech.bugs.firstSeen'),
        hide: true,
        width: 190,
        valueGetter: (b) => formatDateTime(b.first_seen_at),
      },
      { field: 'last_seen_at', headerName: t('tech.bugs.lastSeen'), width: 180, cellRenderer: renderLastSeen },
      {
        field: 'actions',
        headerName: '',
        width: 140,
        sortable: false,
        cellRenderer: renderActions,
      },
    ];
  }, [onOpen, onDelete]);

  return (
    <DuncitTable<BugRow>
      tableId="tech-bugs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getBugRowId}
      emptyText={t('tech.bugs.noBugsYetErrorLogsRoll')}
      defaultSort={{ field: 'last_seen_at', dir: 'desc' }}
      searchPlaceholder="Search title, message, page or source"
      refetchRef={refetchRef}
      onRowClick={onOpen}
      selection={selection}
      toolbarActions={toolbarActions}
    />
  );
}
