import { useMemo } from 'react';
import { DuncitTable, EM_DASH, dateColumn, type DuncitColumn, type TableFetch } from '@duncit/table';
import { useDateFormat, useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { renderCode, renderPerson } from '../../virtual/cells';
import { EventChip, eventLabels, eventOptions, formatCoins } from '../labels';
import type { PhysicalEventRow } from '../queries';

interface Props {
  fetchRows: TableFetch<PhysicalEventRow>;
  /** Opens the card the row is about; batch-only rows (an export) open nothing. */
  onRowClick: (row: PhysicalEventRow) => void;
}

const getRowId = (row: PhysicalEventRow) => row.id;

const buildColumns = (t: Translator['t'], formatDateTime: DateFormatter['formatDateTime']): DuncitColumn<PhysicalEventRow>[] => [
  dateColumn<PhysicalEventRow>({ field: 'created_at', headerName: t('loyalty.physical.colWhen'), minWidth: 170, hide: false, formatDate: formatDateTime }),
  {
    field: 'type',
    headerName: t('loyalty.physical.colEvent'),
    minWidth: 190,
    type: 'enum',
    options: eventOptions(t),
    cellRenderer: (row) => <EventChip type={row.type} t={t} />,
    valueGetter: (row) => eventLabels(t)[row.type] ?? row.type,
  },
  {
    field: 'card_number',
    headerName: t('loyalty.physical.colCard'),
    minWidth: 140,
    type: 'text',
    cellRenderer: (row) => (row.card_number ? renderCode(row.card_number) : EM_DASH),
    valueGetter: (row) => row.card_number || EM_DASH,
  },
  { field: 'coins', headerName: t('loyalty.physical.colCoins'), minWidth: 100, type: 'number', valueGetter: (row) => formatCoins(row.coins) },
  {
    field: 'actor_name',
    headerName: t('loyalty.physical.colActor'),
    type: 'text',
    sortable: false,
    filterable: false,
    flex: 1,
    minWidth: 180,
    cellRenderer: (row) => renderPerson(row.actor_name, row.actor_email),
    valueGetter: (row) => row.actor_name,
  },
  {
    field: 'batch_label',
    headerName: t('loyalty.physical.colBatch'),
    type: 'text',
    sortable: false,
    filterable: false,
    minWidth: 160,
    valueGetter: (row) => row.batch_label || EM_DASH,
  },
  { field: 'note', headerName: t('loyalty.physical.colNote'), type: 'text', flex: 1, minWidth: 180, sortable: false, valueGetter: (row) => row.note || EM_DASH },
];

/** The whole physical card history — minted, redeemed, wrong tries, cancellations and passcode reads. */
export default function PhysicalEventsTable({ fetchRows, onRowClick }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => buildColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <DuncitTable<PhysicalEventRow>
      ariaLabel={t('loyalty.physical.historyTitle')}
      tableId="loyalty-physical-history"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onRowClick}
      emptyText={t('loyalty.physical.historyEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={25}
      searchPlaceholder={t('loyalty.physical.historySearch')}
    />
  );
}
