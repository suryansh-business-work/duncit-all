import type { DuncitColumn } from '@duncit/table';
import { formatDate } from '@duncit/app-settings';
import { StatusChip } from '@duncit/ui';
import { formatMoney } from '@duncit/utils';
import type { Translate } from '../brand-wizard/wizard-steps';
import { RETURN_STATUSES, RETURN_STATUS_COLORS, returnStatusLabel } from './return-labels';
import type { ReturnRow } from './returns.queries';

export const getReturnRowId = (row: ReturnRow) => row.id;

/** "Collar × 2" for one line, "Collar × 2 +1" when there are more. */
const itemsSummary = (t: Translate, row: ReturnRow) => {
  const [first] = row.items;
  if (!first) return '—';
  const line = t('partners.returns.itemLine', { vars: { name: first.name, qty: first.qty } });
  return row.items.length > 1 ? t('partners.returns.itemsMore', { vars: { first: line, more: row.items.length - 1 } }) : line;
};

/** The returns table: who sent what back, its value and where it stands. */
export const buildReturnColumns = (t: Translate): DuncitColumn<ReturnRow>[] => [
  { field: 'return_no', headerName: t('partners.returns.colReturn'), type: 'text', width: 150 },
  { field: 'order_no', headerName: t('partners.returns.colOrder'), type: 'text', width: 150 },
  { field: 'buyer_name', headerName: t('partners.returns.colBuyer'), type: 'text', minWidth: 160 },
  {
    field: 'items',
    headerName: t('partners.returns.colItems'),
    type: 'text',
    flex: 1,
    minWidth: 200,
    sortable: false,
    filterable: false,
    valueGetter: (row) => itemsSummary(t, row),
  },
  {
    field: 'gross',
    headerName: t('partners.returns.colValue'),
    type: 'number',
    width: 120,
    valueGetter: (row) => formatMoney(row.gross, { decimals: 2 }),
  },
  {
    field: 'status',
    headerName: t('shell.common.status'),
    type: 'enum',
    width: 170,
    options: RETURN_STATUSES.map((value) => ({ value, label: returnStatusLabel(t, value) })),
    cellRenderer: (row) => (
      <StatusChip status={row.status} colorMap={RETURN_STATUS_COLORS} label={returnStatusLabel(t, row.status)} />
    ),
    valueGetter: (row) => returnStatusLabel(t, row.status),
  },
  {
    field: 'created_at',
    headerName: t('shell.common.created'),
    type: 'date',
    width: 140,
    valueGetter: (row) => formatDate(row.created_at) || '—',
  },
];
