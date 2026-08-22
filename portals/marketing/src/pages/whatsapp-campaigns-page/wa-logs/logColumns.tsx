import { StatusChip } from '@duncit/ui';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { WA_CATEGORY_OPTIONS, categoryLabel, waMoney } from '../helpers';
import type { WaLogRow } from '../queries';
import {
  CostCell,
  KindCell,
  LOG_STATUS_COLORS,
  ReachCell,
  ReasonCell,
  SendCell,
  type Translate,
} from './logCells';

/** Every state either record can be left in, as the server writes them. */
const STATUS_KEYS = ['SCHEDULED', 'SENDING', 'SENT', 'SKIPPED', 'FAILED', 'CANCELLED'] as const;

/** Half of these already existed for the automation board's own log; reusing
 * them is why "Sent" is not translated twice (rule 40). */
const STATUS_LABEL_KEYS: Record<string, string> = {
  SCHEDULED: 'marketingWhatsapp.logs.statusScheduled',
  SENDING: 'adminWhatsapp.statusSending',
  SENT: 'adminWhatsapp.statusSent',
  SKIPPED: 'adminWhatsapp.statusSkipped',
  FAILED: 'adminWhatsapp.statusFailed',
  CANCELLED: 'marketingWhatsapp.logs.statusCancelled',
};

interface ColumnDeps {
  t: Translate;
  formatDateTime: (value: string) => string;
  /** The symbol the rate card is kept in — costs are printed in it. */
  currency: string;
}

/**
 * The merged feed's columns. Every one is meaningful on both kinds of row,
 * which is what makes one table possible: what differs per kind (a campaign's
 * recipient list, an automatic message's template values) lives behind the row
 * instead of as a column that is blank on half the table.
 */
export function getLogColumns({
  t,
  formatDateTime,
  currency,
}: Readonly<ColumnDeps>): DuncitColumn<WaLogRow>[] {
  const kindLabels: Record<string, string> = {
    CAMPAIGN: t('marketingWhatsapp.logs.kindCampaign'),
    AUTOMATIC: t('marketingWhatsapp.logs.kindAutomatic'),
  };
  const statusOptions = STATUS_KEYS.map((status) => ({
    value: status,
    label: t(STATUS_LABEL_KEYS[status]),
  }));

  return [
    {
      field: 'created_at',
      headerName: t('adminWhatsapp.logColWhen'),
      filter: { type: 'date' },
      width: 175,
      valueGetter: (row) => (row.created_at ? formatDateTime(row.created_at) : EM_DASH),
    },
    {
      field: 'kind',
      headerName: t('marketingWhatsapp.logs.colKind'),
      width: 130,
      filter: {
        type: 'select',
        options: [
          { value: 'CAMPAIGN', label: kindLabels.CAMPAIGN },
          { value: 'AUTOMATIC', label: kindLabels.AUTOMATIC },
        ],
      },
      cellRenderer: (row) => <KindCell row={row} labels={kindLabels} />,
      valueGetter: (row) => kindLabels[row.kind] ?? row.kind,
    },
    {
      field: 'name',
      headerName: t('marketingWhatsapp.logs.colSend'),
      flex: 1.3,
      minWidth: 230,
      cellRenderer: (row) => <SendCell row={row} />,
      valueGetter: (row) => `${row.name} ${row.reference}`,
    },
    {
      // Two different things by kind — an audience, or one number — so there is
      // nothing on either collection for the server to sort it by.
      field: 'target',
      headerName: t('marketingWhatsapp.logs.colTo'),
      sortable: false,
      width: 165,
      valueGetter: (row) => row.target || EM_DASH,
    },
    {
      field: 'status',
      headerName: t('shell.common.status'),
      width: 130,
      filter: { type: 'select', options: statusOptions },
      cellRenderer: (row) => (
        <StatusChip
          status={row.status}
          label={t(STATUS_LABEL_KEYS[row.status] ?? row.status)}
          colorMap={LOG_STATUS_COLORS}
        />
      ),
      valueGetter: (row) => row.status,
    },
    {
      field: 'sent_count',
      headerName: t('marketingWhatsapp.logs.colReach'),
      width: 130,
      cellRenderer: (row) => <ReachCell row={row} t={t} />,
      valueGetter: (row) => `${row.sent_count} / ${row.recipient_count}`,
    },
    {
      field: 'reason',
      headerName: t('adminWhatsapp.logColReason'),
      sortable: false,
      flex: 1.2,
      minWidth: 240,
      cellRenderer: (row) => <ReasonCell row={row} />,
      valueGetter: (row) => row.reason || EM_DASH,
    },
    {
      field: 'cost',
      headerName: t('marketingWhatsapp.logs.colCost'),
      width: 130,
      cellRenderer: (row) => <CostCell row={row} currency={currency} t={t} />,
      valueGetter: (row) => waMoney(row.cost, currency),
    },
    {
      // Meta's category is what the rate was read from, so it belongs to the
      // cost story rather than the front of the row — off by default, one click
      // away in the column chooser, and filterable either way.
      field: 'category',
      headerName: t('adminWhatsapp.logColCategory'),
      hide: true,
      sortable: false,
      width: 150,
      filter: { type: 'select', options: WA_CATEGORY_OPTIONS },
      valueGetter: (row) => categoryLabel(row.category),
    },
  ];
}
