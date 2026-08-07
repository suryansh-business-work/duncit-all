import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import {
  CONTRACT_STATUS_OPTIONS,
  contractStatusLabel,
  type Contract,
  type ContractStatus,
} from '../../graphql/contracts';

interface Props {
  fetchRows: TableFetch<Contract>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  /** Admin-configured date + time, so every screen reads the same clock. */
  formatDateTime: (value: Date) => string;
  onView: (contract: Contract) => void;
  onEdit: (contract: Contract) => void;
  onArchive: (contract: Contract) => void;
}

const getRowId = (c: Contract) => c.id;

/** Monospace, because an id is read character by character when it is quoted. */
const renderId = (c: Contract) => (
  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
    {c.contract_no || '—'}
  </Typography>
);

const renderTitle = (c: Contract) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {c.title}
  </Typography>
);

const STATUS_COLOR: Record<ContractStatus, 'default' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'default',
  ACTIVE: 'success',
  EXPIRED: 'error',
  ARCHIVED: 'warning',
};

const renderStatus = (c: Contract) => (
  <Chip
    size="small"
    variant={c.status === 'ACTIVE' ? 'filled' : 'outlined'}
    color={STATUS_COLOR[c.status]}
    label={contractStatusLabel(c.status)}
  />
);

/**
 * Every contract, with the handle people quote first.
 *
 * Paging, sorting, searching, filtering and export all come from DuncitTable,
 * so this table behaves exactly like Documents and Policies rather than
 * resembling them.
 */
export default function ContractsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  formatDateTime,
  onView,
  onEdit,
  onArchive,
}: Readonly<Props>) {
  const columns = useMemo<DuncitColumn<Contract>[]>(() => {
    const renderActions = (c: Contract) => (
      <>
        <Tooltip title="View">
          <IconButton size="small" onClick={() => onView(c)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(c)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={c.status === 'ARCHIVED' ? 'Already archived' : 'Archive'}>
          {/* A disabled button fires no events, so the tooltip needs a live
              wrapper to say why it cannot be pressed. */}
          <span>
            <IconButton
              size="small"
              disabled={c.status === 'ARCHIVED'}
              onClick={() => onArchive(c)}
            >
              <ArchiveIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </>
    );

    // Only server-allowlisted fields are sortable/filterable
    // (CONTRACT_TABLE_CONFIG): sort contract_no/title/status/counterparty/
    // created_at/updated_at; filter the same as text, status as a select.
    return [
      {
        field: 'contract_no',
        headerName: 'Contract ID',
        width: 150,
        filter: { type: 'text' },
        cellRenderer: renderId,
        valueGetter: (c) => c.contract_no || '—',
      },
      {
        field: 'title',
        headerName: 'Title',
        flex: 1,
        minWidth: 220,
        filter: { type: 'text' },
        cellRenderer: renderTitle,
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 130,
        filter: { type: 'select', options: CONTRACT_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (c) => contractStatusLabel(c.status),
      },
      { field: 'counterparty', headerName: 'Counterparty', minWidth: 180, filter: { type: 'text' } },
      dateColumn<Contract>({
        field: 'updated_at',
        headerName: 'Last updated',
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      dateColumn<Contract>({
        field: 'created_at',
        headerName: 'Created',
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      { field: 'actions', headerName: 'Actions', sortable: false, width: 140, cellRenderer: renderActions },
    ];
  }, [formatDateTime, onView, onEdit, onArchive]);

  return (
    <DuncitTable<Contract>
      tableId="legal-contracts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText="No contracts yet. Add one to get started."
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search contract ID, title or counterparty"
      refetchRef={refetchRef}
    />
  );
}
