import { useCallback, useMemo } from 'react';
import { clientTableFetch, DuncitTable, type DuncitColumn, type TableQueryState } from '@duncit/table';
import { StatusChip, type StatusColorMap } from '@duncit/ui';
import { formatDateTime } from '@duncit/app-settings';
import { formatMoney } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { payableOf, type VenuePayout } from './queries';

const STATUS_COLORS: StatusColorMap = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'error' };

const getRowId = (row: VenuePayout) => row.id;
const searchOf = (row: VenuePayout) => `${row.pod_title} ${row.status}`;

interface Props {
  payouts: readonly VenuePayout[];
  /** The server's currency symbol; formatMoney's default until it lands. */
  symbol?: string;
}

/** The venue's payout history: one row per completion release. */
export default function VenuePayoutsTable({ payouts, symbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo<DuncitColumn<VenuePayout>[]>(
    () => [
      { field: 'pod_title', headerName: t('partners.common.pod'), flex: 1, minWidth: 200, type: 'text' },
      {
        field: 'created_at',
        headerName: t('partners.common.date'),
        width: 180,
        type: 'date',
        valueGetter: (row) => formatDateTime(row.created_at) || '—',
      },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        width: 140,
        type: 'text',
        cellRenderer: (row) => <StatusChip status={row.status} colorMap={STATUS_COLORS} />,
      },
      {
        field: 'amount',
        headerName: t('partners.common.amount'),
        width: 140,
        type: 'number',
        valueGetter: (row) => formatMoney(payableOf(row), { symbol, decimals: 2 }),
      },
    ],
    [t, symbol],
  );
  const fetchRows = useCallback(
    (q: TableQueryState) => clientTableFetch(payouts, searchOf, columns)(q),
    [payouts, columns],
  );
  return (
    <DuncitTable<VenuePayout>
      tableId="partners-venue-payouts"
      ariaLabel={t('mweb.studioOptions.venueEarnings')}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('mweb.venueEarnings.payoutsAppearHereAfterAPod')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
