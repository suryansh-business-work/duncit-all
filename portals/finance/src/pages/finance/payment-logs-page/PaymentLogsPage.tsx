import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { downloadBase64File } from '@duncit/utils';
import { INVOICE_PDF, PAYMENT_TOTALS, PAYMENTS_TABLE, REFUND_PAYMENT, type PaymentRow } from './queries';
import { paymentTableFilter } from './helpers';
import TotalsCards from './TotalsCards';
import PaymentsTable from './PaymentsTable';
import RefundDialog from './RefundDialog';

const POLL_MS = 30000;
const EMPTY_TOTALS = { count: 0, gross: 0, fee: 0, gst: 0 };

export default function PaymentLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);

  // KPI totals come from a filter-wide server aggregation (no row cap); the
  // filter is synced from the table's search/status so the cards track what
  // the table shows.
  const [totalsFilter, setTotalsFilter] = useState<Record<string, string> | undefined>(undefined);
  const totalsKeyRef = useRef('null');
  const { data, refetch } = useQuery<any>(PAYMENT_TOTALS, {
    variables: { filter: totalsFilter },
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
        query: PAYMENTS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: page.paymentsTable.rows as PaymentRow[],
        total: page.paymentsTable.total as number,
      };
    },
    [client],
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
          mb: 3
        }}>
        <ReceiptLongIcon color="primary" />
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            flex: 1
          }}>
          {t('finance.payment.logsTitle')}
        </Typography>
      </Stack>

      <TotalsCards totals={totals} />

      <PaymentsTable
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
