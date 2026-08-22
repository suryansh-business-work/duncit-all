import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, IconButton, Tooltip, Typography } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import {
  DuncitTable,
  dateColumn,
  entityIdColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import {
  CONTRACT_STATUS_OPTIONS,
  contractStatusLabel,
  type Contract,
  type ContractStatus,
} from '../../graphql/contracts';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<Contract>[]>(() => {
    const renderActions = (c: Contract) => (
      <>
        <Tooltip title={t('shell.common.view')}>
          <IconButton size="small" onClick={() => onView(c)}>
            <VisibilityIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title={t('shell.common.edit')}>
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
      entityIdColumn<Contract>({ field: 'contract_no', headerName: t('legal.contracts.colId') }),
      {
        field: 'title',
        headerName: t('shell.common.title'),
        flex: 1,
        minWidth: 220,
        filter: { type: 'text' },
        cellRenderer: renderTitle,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        filter: { type: 'select', options: CONTRACT_STATUS_OPTIONS },
        cellRenderer: renderStatus,
        valueGetter: (c) => contractStatusLabel(c.status),
      },
      { field: 'counterparty', headerName: t('legal.contracts.colCounterparty'), minWidth: 180, filter: { type: 'text' } },
      dateColumn<Contract>({
        field: 'updated_at',
        headerName: t('legal.contracts.colLastUpdated'),
        hide: false,
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      dateColumn<Contract>({
        field: 'created_at',
        headerName: t('shell.common.created'),
        minWidth: 180,
        formatDate: formatDateTime,
      }),
      { field: 'actions', headerName: t('shell.common.actions'), sortable: false, width: 140, cellRenderer: renderActions },
    ];
  }, [formatDateTime, onView, onEdit, onArchive]);

  return (
    <DuncitTable<Contract>
      tableId="legal-contracts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('legal.contracts.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder="Search contract ID, title or counterparty"
      refetchRef={refetchRef}
    />
  );
}
