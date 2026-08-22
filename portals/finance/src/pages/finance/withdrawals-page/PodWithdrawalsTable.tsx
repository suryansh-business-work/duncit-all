import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  EM_DASH,
  type DuncitColumn,
  type TableFetch,
  type TableFilterValue,
} from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import type { PodWithdrawalGroup } from './queries';
import { translatedRoleLabel, type WithdrawerRole } from './roles';

type ChipColor = 'default' | 'primary' | 'secondary' | 'info' | 'warning' | 'success';

/** Same colours the per-withdrawal table gives each role, so a partner reads
 * the same on both levels. */
const ROLE_COLOR: Record<WithdrawerRole, ChipColor> = {
  HOST: 'primary',
  VENUE_OWNER: 'info',
  ECOMM_MANAGER: 'secondary',
  CLUB_ADMIN: 'default',
};

const getPodRowId = (row: PodWithdrawalGroup) => row.pod_id;

const renderRequestedFrom = (t: Translator['t']) => (row: PodWithdrawalGroup) => (
  <RequestedFromCell roles={row.requested_from} t={t} />
);

const renderStatus = (t: Translator['t']) => (row: PodWithdrawalGroup) => (
  <Chip
    size="small"
    color={row.status === 'APPROVED' ? 'success' : 'warning'}
    label={
      row.status === 'APPROVED'
        ? t('finance.withdrawals.statusApproved')
        : t('finance.withdrawals.statusPending')
    }
  />
);

/** Pod Title — the pod the withdrawals were earned on. */
const renderPodTitle = (row: PodWithdrawalGroup) => (
  <Typography variant="body2" fontWeight={700} component="span">
    {row.pod_title || EM_DASH}
  </Typography>
);

/**
 * Requested From — every partner who has raised a request against this pod.
 *
 * The role is keyed on itself: the server returns each role once, in a fixed
 * order, so it is a stable unique id for the chip (never the array index).
 */
function RequestedFromCell({ roles, t }: Readonly<{ roles: WithdrawerRole[]; t: Translator['t'] }>) {
  if (roles.length === 0) return <>{EM_DASH}</>;
  return (
    <Stack direction="row" spacing={0.5} component="span" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {roles.map((role) => (
        <Chip
          key={role}
          size="small"
          variant="outlined"
          color={ROLE_COLOR[role] ?? 'default'}
          label={translatedRoleLabel(t, role)}
        />
      ))}
    </Stack>
  );
}

interface Props {
  fetchRows: TableFetch<PodWithdrawalGroup>;
  refetchRef: MutableRefObject<(() => void) | null>;
  externalFilters: ReadonlyArray<TableFilterValue>;
  toolbarActions: ReactNode;
  emptyText: string;
  onRowClick: (row: PodWithdrawalGroup) => void;
}

export default function PodWithdrawalsTable({
  fetchRows,
  refetchRef,
  externalFilters,
  toolbarActions,
  emptyText,
  onRowClick,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const columns = useMemo<DuncitColumn<PodWithdrawalGroup>[]>(
    () => [
      {
        field: 'pod_title',
        headerName: t('finance.withdrawals.colPodTitle'),
        flex: 1,
        minWidth: 240,
        cellRenderer: renderPodTitle,
        valueGetter: (row) => row.pod_title || EM_DASH,
      },
      {
        field: 'requested_from',
        headerName: t('finance.withdrawals.colRequestedFrom'),
        flex: 1,
        minWidth: 280,
        // Derived from the allocations rather than stored on a row, so the
        // server has no path to sort or filter it — the page-level Role filter
        // is how this column is narrowed.
        sortable: false,
        cellRenderer: renderRequestedFrom(t),
        valueGetter: (row) => row.requested_from.map((role) => translatedRoleLabel(t, role)).join(', '),
      },
      {
        field: 'status',
        headerName: t('finance.withdrawals.colStatus'),
        width: 160,
        cellRenderer: renderStatus(t),
        valueGetter: (row) => row.status,
      },
    ],
    [t],
  );

  return (
    <DuncitTable<PodWithdrawalGroup>
      tableId="finance-withdrawal-pods"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getPodRowId}
      onRowClick={onRowClick}
      emptyText={emptyText}
      defaultSort={{ field: 'last_requested_at', dir: 'desc' }}
      searchPlaceholder={t('finance.withdrawals.searchPods')}
      refetchRef={refetchRef}
      externalFilters={externalFilters}
      toolbarActions={toolbarActions}
    />
  );
}
