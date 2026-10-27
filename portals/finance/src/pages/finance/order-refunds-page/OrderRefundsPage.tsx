import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import UndoIcon from '@mui/icons-material/Undo';
import { DuncitTable, tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { fmt } from '../payment-logs-page/helpers';
import TotalsStrip, { type StripTotal } from '../payment-logs-page/TotalsStrip';
import { buildOrderRefundColumns } from './orderRefundColumns';
import {
  EMPTY_ORDER_REFUND_SUMMARY,
  SHOP_ORDER_REFUNDS_TABLE,
  type OrderRefundRow,
  type OrderRefundsData,
  type OrderRefundSummary,
  type PaymentShop,
} from './queries';

const POLL_MS = 30000;

/** Each shop keeps its own saved column layout and its own page copy. */
const TABLE_ID: Record<PaymentShop, string> = {
  POD_SHOP: 'finance-pod-shop-order-refunds',
  ECOMM: 'finance-ecomm-order-refunds',
};

/** Every key is a literal so the localization gate can see it rendered. */
function pageCopy(t: Translator['t'], shop: PaymentShop) {
  if (shop === 'ECOMM') {
    return {
      title: t('finance.orderRefunds.titleEcomm'),
      subtitle: t('finance.orderRefunds.subtitleEcomm'),
      manualHint: t('finance.orderRefunds.manualPayoutHintEcomm'),
    };
  }
  return {
    title: t('finance.orderRefunds.titlePodShop'),
    subtitle: t('finance.orderRefunds.subtitlePodShop'),
    manualHint: t('finance.orderRefunds.manualPayoutHintPodShop'),
  };
}

const getRowId = (r: OrderRefundRow) => r.id;

/**
 * Finance › Pod Shop › Order Refunds and Finance › Ecomm › Order Refunds: one
 * row per refund at ORDER level — a cancelled order or a returned item — for
 * ONE shop. The shop is a prop of the route and is fixed by the server; the two
 * shops are different products and never share a list.
 *
 * Read-only by design, like User Refund Logs: a refund is raised where the
 * decision is made (the order, the return), and this is where it is accounted
 * for. What the page exists to make plain is the DESTINATION — the money that
 * was paid goes back to the original payment method, the coins that were
 * redeemed go back to the Duncit Coin wallet.
 */
export default function OrderRefundsPage({ shop }: Readonly<{ shop: PaymentShop }>) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const [summary, setSummary] = useState<OrderRefundSummary>(EMPTY_ORDER_REFUND_SUMMARY);
  const copy = pageCopy(t, shop);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<OrderRefundsData>({
        query: SHOP_ORDER_REFUNDS_TABLE,
        variables: { ...tableQueryToGql(q), shop },
        fetchPolicy: 'network-only',
      });
      const page = data?.shopOrderRefundsTable;
      if (!page) return { rows: [], total: 0 };
      setSummary(page.summary);
      return { rows: page.rows, total: page.total };
    },
    [client, shop],
  );

  // Refunds are raised elsewhere — keep the list current without a reload.
  useEffect(() => {
    const timer = globalThis.setInterval(() => refetchRef.current?.(), POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, []);

  // The refund's audit is the payment it reverses. A row whose payment is gone opens nothing.
  const handleOpen = useCallback(
    (r: OrderRefundRow) => {
      if (r.payment_doc_id) navigate(`/payment-logs/${r.payment_doc_id}`);
    },
    [navigate],
  );

  const columns = useMemo(() => buildOrderRefundColumns(t, shop), [t, shop]);

  const totals = useMemo<StripTotal[]>(
    () => [
      { key: 'count', label: t('finance.orderRefunds.totalCount'), value: summary.count },
      { key: 'cash', label: t('finance.orderRefunds.totalCash'), value: fmt(summary.cash_total) },
      { key: 'coins', label: t('finance.orderRefunds.totalCoins'), value: summary.coins_total },
      {
        key: 'manual',
        label: t('finance.orderRefunds.totalManual'),
        value: fmt(summary.manual_payout_total),
        hint: copy.manualHint,
      },
    ],
    [summary, t, copy.manualHint],
  );

  return (
    <Box>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1 }}>
        <UndoIcon color="primary" />
        <Typography component="h1" variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
          {copy.title}
        </Typography>
      </Stack>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        {copy.subtitle}
      </Typography>
      <Alert severity="info" sx={{ mb: 3 }} data-testid="finance-order-refunds-destination-hint">
        {t('finance.orderRefunds.destinationHint')}
      </Alert>

      <TotalsStrip totals={totals} testId="finance-order-refunds-totals" />

      <DuncitTable<OrderRefundRow>
        ariaLabel={copy.title}
        tableId={TABLE_ID[shop]}
        columns={columns}
        fetchRows={fetchRows}
        getRowId={getRowId}
        onRowClick={handleOpen}
        emptyText={t('finance.orderRefunds.empty')}
        defaultSort={{ field: 'event_at', dir: 'desc' }}
        searchPlaceholder={t('finance.orderRefunds.search')}
        refetchRef={refetchRef}
      />
    </Box>
  );
}
