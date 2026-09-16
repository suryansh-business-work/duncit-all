import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Tooltip, Typography } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import DrawIcon from '@mui/icons-material/Draw';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { DuncitIconButton } from '@duncit/buttons';
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
import { signingStatusOptions } from '../../components/signing';
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
  /** Open the signing workflow — preview, sign, then send it on. */
  onSign: (contract: Contract) => void;
}

const getRowId = (c: Contract) => c.id;

const renderTitle = (c: Contract) => (
  <Typography variant="body2" component="span" sx={{
    fontWeight: 700
  }}>
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
  onSign,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<Contract>[]>(() => {
    const signedLabel = (c: Contract) =>
      c.signing_status === 'SIGNED' ? t('legal.sign.signed') : t('legal.sign.unsigned');

    // The one thing an operator scans this column for: is it executed yet.
    const renderSigning = (c: Contract) => {
      const signed = c.signing_status === 'SIGNED';
      return (
        <Chip
          size="small"
          variant={signed ? 'filled' : 'outlined'}
          color={signed ? 'success' : 'default'}
          label={signedLabel(c)}
        />
      );
    };

    const editTooltip = (c: Contract) =>
      c.is_locked ? t('legal.sign.locked') : t('shell.common.edit');
    const signTooltip = (c: Contract) =>
      c.signing_status === 'SIGNED' ? t('legal.sign.viewSigned') : t('legal.sign.action');
    const archiveTooltip = (c: Contract) =>
      c.status === 'ARCHIVED' ? t('legal.contracts.alreadyArchived') : t('legal.contracts.archive');

    const renderActions = (c: Contract) => (
      <>
        <Tooltip title={t('shell.common.view')}>
          <DuncitIconButton size="small" aria-label={t('shell.common.view')} onClick={() => onView(c)}>
            <VisibilityIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        {/* A disabled button fires no events, so the tooltip needs a live
            wrapper to say why it cannot be pressed. */}
        <Tooltip title={editTooltip(c)}>
          <span>
            <DuncitIconButton
              size="small"
              disabled={c.is_locked}
              aria-label={t('shell.common.edit')}
              onClick={() => onEdit(c)}
            >
              <EditIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
        <Tooltip title={signTooltip(c)}>
          <DuncitIconButton size="small" aria-label={t('legal.sign.action')} onClick={() => onSign(c)}>
            <DrawIcon fontSize="small" />
          </DuncitIconButton>
        </Tooltip>
        <Tooltip title={archiveTooltip(c)}>
          <span>
            <DuncitIconButton
              size="small"
              disabled={c.status === 'ARCHIVED'}
              aria-label={t('legal.contracts.archive')}
              onClick={() => onArchive(c)}
            >
              <ArchiveIcon fontSize="small" />
            </DuncitIconButton>
          </span>
        </Tooltip>
      </>
    );

    // Keys allowlisted on the server (CONTRACT_TABLE_CONFIG); signing_status via liftSigningStatusFilter.
    return [
      entityIdColumn<Contract>({ field: 'contract_no', headerName: t('legal.contracts.colId') }),
      {
        field: 'title',
        headerName: t('shell.common.title'),
        flex: 1,
        minWidth: 220,
        type: 'text',
        cellRenderer: renderTitle,
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 130,
        type: 'enum',
        options: CONTRACT_STATUS_OPTIONS,
        cellRenderer: renderStatus,
        valueGetter: (c) => contractStatusLabel(c.status),
      },
      {
        field: 'signing_status',
        headerName: t('legal.contracts.colSigning'),
        width: 120,
        type: 'enum',
        options: signingStatusOptions(t),
        cellRenderer: renderSigning,
        valueGetter: signedLabel,
      },
      { field: 'counterparty', headerName: t('legal.contracts.colCounterparty'), minWidth: 180, type: 'text' },
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
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 180, cellRenderer: renderActions },
    ];
  }, [formatDateTime, onView, onEdit, onArchive, onSign, t]);

  return (
    <DuncitTable<Contract>
      ariaLabel={t('legal.contracts.title')}
      tableId="legal-contracts"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      toolbarActions={toolbarActions}
      emptyText={t('legal.contracts.empty')}
      defaultSort={{ field: 'updated_at', dir: 'desc' }}
      searchPlaceholder={t('legal.contracts.search')}
      refetchRef={refetchRef}
    />
  );
}
