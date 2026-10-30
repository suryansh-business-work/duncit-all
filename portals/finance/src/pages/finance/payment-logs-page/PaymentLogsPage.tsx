import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation, type Translator } from '@duncit/app-settings';
import { downloadBase64File } from '@duncit/utils';
import {
  INVOICE_PDF,
  PAYMENT_TOTALS,
  PAYMENTS_TABLE,
  REFUND_PAYMENT,
  SHOP_PAYMENTS_TABLE,
  type PaymentRow,
  type PaymentShop,
  type PaymentTotals,
} from './queries';
import { paymentTableFilter } from './helpers';
import TotalsCards from './TotalsCards';
import PaymentsTable from './PaymentsTable';
import RefundDialog from './RefundDialog';

const POLL_MS = 30000;
const EMPTY_TOTALS: PaymentTotals = { count: 0, gross: 0, fee: 0, gst: 0, ticket_discount_total: 0, smart_incentive_total: 0 };

/** A log's heading, and for a shop's log a line saying what is — and is not — in
 * it. Every key is a literal so the localization gate can see it rendered. */
function logCopy(t: Translator['t'], shop?: PaymentShop): { title: string; subtitle: string } {
  if (shop === 'POD_SHOP') {
    return { title: t('finance.payment.logsTitlePodShop'), subtitle: t('finance.payment.logsSubtitlePodShop') };
  }
  if (shop === 'ECOMM') {
    return { title: t('finance.payment.logsTitleEcomm'), subtitle: t('finance.payment.logsSubtitleEcomm') };
  }
  return { title: t('finance.payment.logsTitle'), subtitle: '' };
}

/**
 * Payment Logs. With no `shop` it is every payment, as it always was (the Logs
 * console mounts it that way too). With one it is that shop's payments only —
 * the server fixes the scope, this page just asks for it.
 */
export default function PaymentLogsPage({ shop }: Readonly<{ shop?: PaymentShop }>) {
  const { t } = useTranslation();
  const { title, subtitle } = logCopy(t, shop);
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);

  // KPI totals come from a filter-wide server aggregation (no row cap); the
  // filter is synced from the table's search/status so the cards track what
  // the table shows.
  const [totalsFilter, setTotalsFilter] = useState<Record<string, string> | undefined>(undefined);
  const totalsKeyRef = useRef('null');
  const { data, refetch } = useQuery<any>(PAYMENT_TOTALS, {
    variables: shop ? { filter: totalsFilter, shop } : { filter: totalsFilter },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_MS,
  });

  const totals = data?.paymentTotals ?? EMPTY_TOTALS;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filter = paymentTableFilter(q);
      const key = JSON.stringify(filter ?? null);
      if (key !== totalsKeyRef.current) {
        totalsKeyRef.current = key;
        setTotalsFilter(filter);
      }
      const { data: page } = await client.query<any>({
        query: shop ? SHOP_PAYMENTS_TABLE : PAYMENTS_TABLE,
        variables: shop ? { ...tableQueryToGql(q), shop } : tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      const table = shop ? page.shopPaymentsTable : page.paymentsTable;
      return { rows: table.rows as PaymentRow[], total: table.total as number };
    },
    [client, shop],
  );

  // The old page auto-refreshed via pollInterval — keep the table live too.
  useEffect(() => {
    const timer = globalThis.setInterval(() => refetchRef.current?.(), POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, []);

  // Opening a row is the audit page: what this payment charged and what it created.
  const handleOpen = useCallback(
    (p: PaymentRow) => navigate(`/payment-logs/${p.id}`),
    [navigate],
  );

  const [refundMut, { loading: refundLoading }] = useMutation<any>(REFUND_PAYMENT);
  const [refundFor, setRefundFor] = useState<PaymentRow | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoice = useCallback(
    async (p: PaymentRow) => {
      // The download control is disabled unless the payment has an invoice number.
      const invoiceNo = p.invoice_no as string;
      setActionError(null);
      setDownloadingId(p.id);
      try {
        const { data: pdfData } = await client.query<any>({
          query: INVOICE_PDF,
          variables: { id: p.id },
          fetchPolicy: 'network-only',
        });
        const b64 = pdfData?.paymentInvoicePdfBase64;
        if (!b64) throw new Error(t('finance.payment.invoiceUnavailable'));
        downloadBase64File(b64, `invoice-${invoiceNo.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`, 'application/pdf');
      } catch (e: any) {
        // Apollo rejects with an Error carrying a message; the nullish fallback is defensive.
        const message = e?.message ?? /* istanbul ignore next */ t('finance.payment.invoiceDownloadFailed');
        setActionError(message);
      } finally {
        setDownloadingId(null);
      }
    },
    [client, t],
  );

  const handleConfirmRefund = async () => {
    // The confirm dialog is only open (and this handler only bound) with a payment selected.
    const payment = refundFor as PaymentRow;
    setActionError(null);
    try {
      await refundMut({ variables: { id: payment.id, reason: refundReason || null } });
      setRefundFor(null);
      setRefundReason('');
      refetchRef.current?.();
      refetch();
    } catch (e: any) {
      // Apollo rejects with an Error carrying a message; the nullish fallback is defensive.
      const message = e?.message ?? /* istanbul ignore next */ t('finance.payment.refundFailed');
      setActionError(message);
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: shop ? 1 : 3
        }}>
        <ReceiptLongIcon color="primary" />
        <Typography component="h1"
          variant="h5"
          sx={{
            fontWeight: 700,
            flex: 1
          }}>
          {title}
        </Typography>
      </Stack>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
          {subtitle}
        </Typography>
      )}

      <TotalsCards totals={totals} />

      <PaymentsTable
        shop={shop}
        title={title}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        downloadingId={downloadingId}
        onDownload={handleDownloadInvoice}
        onRefund={setRefundFor}
        onOpen={handleOpen}
      />

      <RefundDialog
        refundFor={refundFor}
        refundReason={refundReason}
        setRefundReason={setRefundReason}
        refundLoading={refundLoading}
        actionError={actionError}
        onClose={() => setRefundFor(null)}
        onConfirm={handleConfirmRefund}
      />

      {actionError && !refundFor && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
    </Box>
  );
}
