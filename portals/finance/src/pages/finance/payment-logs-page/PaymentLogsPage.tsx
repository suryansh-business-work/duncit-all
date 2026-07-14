import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { INVOICE_PDF, PAYMENTS, PAYMENTS_TABLE, REFUND_PAYMENT, type PaymentRow } from './queries';
import { downloadPdfFromBase64, paymentTableFilter } from './helpers';
import TotalsCards from './TotalsCards';
import PaymentsTable from './PaymentsTable';
import RefundDialog from './RefundDialog';

const POLL_MS = 30000;

export default function PaymentLogsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  // KPI totals keep the legacy list query (limit 200, 30s poll); its filter is
  // synced from the table's search/status so the cards track what the table shows.
  const [totalsFilter, setTotalsFilter] = useState<Record<string, string> | undefined>(undefined);
  const totalsKeyRef = useRef('null');
  const { data, refetch } = useQuery(PAYMENTS, {
    variables: { filter: totalsFilter, limit: 200 },
    fetchPolicy: 'cache-and-network',
    pollInterval: POLL_MS,
  });

  const items: any[] = data?.payments ?? [];
  const totals = useMemo(() => {
    return items.reduce(
      (a, p) => {
        if (p.status === 'SUCCESS') {
          a.gross += p.total;
          a.fee += p.platform_fee_amount;
          a.gst += p.gst_amount;
          a.count += 1;
        }
        return a;
      },
      { gross: 0, fee: 0, gst: 0, count: 0 }
    );
  }, [items]);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const filter = paymentTableFilter(q);
      const key = JSON.stringify(filter ?? null);
      if (key !== totalsKeyRef.current) {
        totalsKeyRef.current = key;
        setTotalsFilter(filter);
      }
      const { data: page } = await client.query({
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

  const [refundMut, { loading: refundLoading }] = useMutation(REFUND_PAYMENT);
  const [refundFor, setRefundFor] = useState<PaymentRow | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoice = useCallback(
    async (p: PaymentRow) => {
      if (!p.invoice_no) return;
      setActionError(null);
      setDownloadingId(p.id);
      try {
        const { data: pdfData } = await client.query({
          query: INVOICE_PDF,
          variables: { id: p.id },
          fetchPolicy: 'network-only',
        });
        const b64 = pdfData?.paymentInvoicePdfBase64;
        if (!b64) throw new Error('Invoice not available');
        downloadPdfFromBase64(b64, `invoice-${p.invoice_no.replace(/[^A-Za-z0-9_-]+/g, '-')}.pdf`);
      } catch (e: any) {
        setActionError(e?.message ?? 'Could not download invoice');
      } finally {
        setDownloadingId(null);
      }
    },
    [client],
  );

  const handleConfirmRefund = async () => {
    if (!refundFor) return;
    setActionError(null);
    try {
      await refundMut({ variables: { id: refundFor.id, reason: refundReason || null } });
      setRefundFor(null);
      setRefundReason('');
      refetchRef.current?.();
      refetch();
    } catch (e: any) {
      setActionError(e?.message ?? 'Refund failed');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <ReceiptLongIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Payment Logs
        </Typography>
      </Stack>

      <TotalsCards totals={totals} />

      <PaymentsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        downloadingId={downloadingId}
        onDownload={handleDownloadInvoice}
        onRefund={setRefundFor}
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
