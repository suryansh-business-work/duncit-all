import { useMemo } from 'react';
import { Chip, Stack, Typography } from '@mui/material';
import {
  DuncitTable,
  EM_DASH,
  dateColumn,
  type DuncitColumn,
  type TableFetch,
} from '@duncit/table';
import { formatMoney } from '@duncit/utils';
import { useTranslation, type DateFormatter, type Translator } from '@duncit/app-settings';
import { STATUS_COLORS, displayStatus, renderCode, renderPerson, statusLabels, statusOptions } from './cells';
import type { GiftCardCardRow } from './queries';

interface Props {
  fetchRows: TableFetch<GiftCardCardRow>;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
}

const getCardRowId = (row: GiftCardCardRow) => row.id;

/**
 * `sortable: false` on the joined columns is deliberate: buyer and redeemer are
 * resolved after the page is fetched, so they are not in the server's sort
 * allowlist. Leaving them sortable would offer a sort the engine silently drops.
 */
const buildColumns = (
  t: Translator['t'],
  symbol: string,
  formatDateTime: DateFormatter['formatDateTime'],
): DuncitColumn<GiftCardCardRow>[] => {
  const labels = statusLabels(t);
  // The SHOP theme has no snapshotted category name — clients localize it.
  const themeName = (row: GiftCardCardRow) =>
    row.scope_name || t('finance.giftCards.themeShop');
  const renderTheme = (row: GiftCardCardRow) => (
    <Stack component="span" sx={{ minWidth: 0, lineHeight: 1.2 }}>
      <Typography variant="body2" noWrap component="span">
        {themeName(row)}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap component="span">
        {row.scope_type}
      </Typography>
    </Stack>
  );
  const renderStatus = (row: GiftCardCardRow) => {
    const status = displayStatus(row);
    return (
      <Chip
        size="small"
        label={labels[status]}
        color={STATUS_COLORS[status]}
        variant="outlined"
        sx={{ fontWeight: 800 }}
      />
    );
  };
  return [
    dateColumn<GiftCardCardRow>({
      field: 'created_at',
      headerName: t('finance.giftCards.colCreated'),
      minWidth: 180,
      hide: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'code',
      headerName: t('finance.giftCards.colCode'),
      minWidth: 180,
      cellRenderer: (row) => renderCode(row.code),
      valueGetter: (row) => row.code,
    },
    {
      field: 'scope_name',
      headerName: t('finance.giftCards.colTheme'),
      flex: 1,
      minWidth: 160,
      cellRenderer: renderTheme,
      valueGetter: themeName,
    },
    {
      field: 'initial_amount',
      headerName: t('finance.giftCards.colAmount'),
      minWidth: 110,
      filter: { type: 'number' },
      valueGetter: (row) => formatMoney(row.initial_amount, { symbol }),
    },
    {
      field: 'status',
      headerName: t('finance.giftCards.colStatus'),
      minWidth: 130,
      filter: { type: 'select', options: statusOptions(t) },
      cellRenderer: renderStatus,
      valueGetter: (row) => displayStatus(row),
    },
    {
      field: 'purchaser_name',
      headerName: t('finance.giftCards.colBuyer'),
      sortable: false,
      flex: 1,
      minWidth: 180,
      cellRenderer: (row) => renderPerson(row.purchaser_name, row.purchaser_email),
      valueGetter: (row) => row.purchaser_name,
    },
    {
      field: 'recipient_name',
      headerName: t('finance.giftCards.colRecipient'),
      flex: 1,
      minWidth: 180,
      cellRenderer: (row) => renderPerson(row.recipient_name, row.recipient_email),
      valueGetter: (row) => row.recipient_name,
    },
    {
      field: 'redeemer_name',
      headerName: t('finance.giftCards.colRedeemer'),
      sortable: false,
      flex: 1,
      minWidth: 180,
      cellRenderer: (row) => renderPerson(row.redeemer_name, row.redeemer_email),
      valueGetter: (row) => row.redeemer_name || EM_DASH,
    },
    dateColumn<GiftCardCardRow>({
      field: 'expires_at',
      headerName: t('finance.giftCards.colExpires'),
      minWidth: 180,
      hide: false,
      formatDate: formatDateTime,
    }),
    {
      field: 'payment_id',
      headerName: t('finance.giftCards.colPayment'),
      sortable: false,
      minWidth: 160,
      valueGetter: (row) => row.payment_id || EM_DASH,
    },
  ];
};

export default function GiftCardCardsTable({
  fetchRows,
  currencySymbol,
  formatDateTime,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildColumns(t, currencySymbol, formatDateTime),
    [t, currencySymbol, formatDateTime],
  );

  return (
    <DuncitTable<GiftCardCardRow>
      tableId="finance-gift-cards"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCardRowId}
      emptyText={t('finance.giftCards.cardsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder={t('finance.giftCards.cardsSearch')}
    />
  );
}
