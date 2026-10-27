import { useMemo } from 'react';
import { DuncitTable, EM_DASH, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { renderCode, renderPerson } from '../../virtual/cells';
import {
  MaskedPasscode,
  PhysicalStatusChip,
  formatCoins,
  physicalStatusLabels,
  physicalStatusOptions,
} from '../labels';
import type { PhysicalCardRow } from '../queries';

interface Props {
  fetchRows: TableFetch<PhysicalCardRow>;
  onRowClick: (row: PhysicalCardRow) => void;
  /** Distinct per mount, so a batch's card list keeps its own column layout. */
  tableId: string;
}

const getRowId = (row: PhysicalCardRow) => row.id;

/** The people and the batch are joined after the page is fetched, so they cannot sort or filter server-side. */
const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<PhysicalCardRow>[] => [
  dateColumn<PhysicalCardRow>({ field: 'created_at', headerName: t('loyalty.physical.colCreated'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  {
    field: 'card_number',
    headerName: t('loyalty.physical.colCardNumber'),
    minWidth: 140,
    type: 'text',
    cellRenderer: (row) => renderCode(row.card_number),
    valueGetter: (row) => row.card_number,
  },
  {
    field: 'passcode_last4',
    headerName: t('loyalty.physical.colPasscode'),
    minWidth: 190,
    type: 'text',
    sortable: false,
    filterable: false,
    cellRenderer: (row) => <MaskedPasscode last4={row.passcode_last4} t={t} />,
    valueGetter: (row) => row.passcode_last4,
  },
  { field: 'coins', headerName: t('loyalty.physical.colCoins'), minWidth: 100, type: 'number', valueGetter: (row) => formatCoins(row.coins) },
  {
    field: 'status',
    headerName: t('loyalty.physical.colStatus'),
    minWidth: 130,
    type: 'enum',
    options: physicalStatusOptions(t),
    cellRenderer: (row) => <PhysicalStatusChip status={row.status} t={t} />,
    valueGetter: (row) => physicalStatusLabels(t)[row.status],
  },
  {
    field: 'assigned_user_name',
    headerName: t('loyalty.physical.colMember'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 180,
    cellRenderer: (row) => renderPerson(row.assigned_user_name, row.assigned_user_email),
    valueGetter: (row) => row.assigned_user_name || EM_DASH,
  },
  {
    field: 'redeemer_name',
    headerName: t('loyalty.physical.colRedeemer'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 180,
    cellRenderer: (row) => renderPerson(row.redeemer_name, row.redeemer_email),
    valueGetter: (row) => row.redeemer_name || EM_DASH,
  },
  dateColumn<PhysicalCardRow>({ field: 'redeemed_at', headerName: t('loyalty.physical.colRedeemedAt'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  {
    field: 'batch_label',
    headerName: t('loyalty.physical.colBatch'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 160,
    valueGetter: (row) => row.batch_label || EM_DASH,
  },
  dateColumn<PhysicalCardRow>({ field: 'expires_at', headerName: t('loyalty.physical.colExpires'), minWidth: 170, hide: false, formatDate: formatDateTime }),
];

/** Every printed card — its number, the last four passcode digits, its coins and who it belongs to. */
export default function PhysicalCardsTable({ fetchRows, onRowClick, tableId }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  // Memoised: DuncitTable rebuilds its column defs whenever this array changes identity.
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable<PhysicalCardRow>
      ariaLabel={t('loyalty.physical.cardsTitle')}
      tableId={tableId}
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText={t('loyalty.physical.cardsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={25}
      searchPlaceholder={t('loyalty.physical.cardsSearch')}
    />
  );
}
