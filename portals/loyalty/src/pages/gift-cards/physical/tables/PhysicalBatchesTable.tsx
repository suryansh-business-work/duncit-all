import { useMemo } from 'react';
import { DuncitTable, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { renderPerson } from '../../virtual/cells';
import { formatCoins } from '../labels';
import type { PhysicalBatchRow } from '../queries';

interface Props {
  fetchRows: TableFetch<PhysicalBatchRow>;
  onRowClick: (row: PhysicalBatchRow) => void;
}

const getRowId = (row: PhysicalBatchRow) => row.id;

/** Redeemed / cancelled counts and the creator are computed after the page is fetched — not sortable. */
const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<PhysicalBatchRow>[] => [
  dateColumn<PhysicalBatchRow>({ field: 'created_at', headerName: t('loyalty.physical.colGenerated'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  { field: 'label', headerName: t('loyalty.physical.colBatch'), flex: 1, minWidth: 200, type: 'text', valueGetter: (row) => row.label },
  { field: 'coins', headerName: t('loyalty.physical.colCoinsEach'), minWidth: 110, type: 'number', valueGetter: (row) => formatCoins(row.coins) },
  { field: 'quantity', headerName: t('loyalty.physical.colQuantity'), minWidth: 100, type: 'number', valueGetter: (row) => formatCoins(row.quantity) },
  {
    field: 'total_coins',
    headerName: t('loyalty.physical.colTotalCoins'),
    minWidth: 120,
    type: 'number',
    sortable: false,
    filterable: false,
    valueGetter: (row) => formatCoins(row.total_coins),
  },
  {
    field: 'assigned',
    headerName: t('loyalty.physical.colMode'),
    minWidth: 120,
    type: 'text',
    sortable: false,
    filterable: false,
    valueGetter: (row) => (row.assigned ? t('loyalty.physical.modeMembersShort') : t('loyalty.physical.modeBulkShort')),
  },
  {
    field: 'redeemed_count',
    headerName: t('loyalty.physical.colRedeemed'),
    minWidth: 110,
    type: 'number',
    sortable: false,
    filterable: false,
    valueGetter: (row) => `${formatCoins(row.redeemed_count)} / ${formatCoins(row.quantity)}`,
  },
  {
    field: 'voided_count',
    headerName: t('loyalty.physical.colVoided'),
    minWidth: 110,
    type: 'number',
    sortable: false,
    filterable: false,
    valueGetter: (row) => formatCoins(row.voided_count),
  },
  dateColumn<PhysicalBatchRow>({ field: 'expires_at', headerName: t('loyalty.physical.colExpires'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  {
    field: 'created_by_name',
    headerName: t('loyalty.physical.colCreatedBy'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 180,
    cellRenderer: (row) => renderPerson(row.created_by_name, row.created_by_email),
    valueGetter: (row) => row.created_by_name,
  },
];

/** Every generation run: what each card carries, how many were made and how many have paid out. */
export default function PhysicalBatchesTable({ fetchRows, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable<PhysicalBatchRow>
      ariaLabel={t('loyalty.physical.batchesTitle')}
      tableId="loyalty-physical-batches"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText={t('loyalty.physical.batchesEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={25}
      searchPlaceholder={t('loyalty.physical.batchesSearch')}
    />
  );
}
