import { useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import RefreshIcon from '@mui/icons-material/Refresh';
import { INVOICE_PDF, PAYMENTS, REFUND_PAYMENT } from './queries';
import { downloadPdfFromBase64 } from './helpers';
import TotalsCards from './TotalsCards';
import PaymentsTable from './PaymentsTable';
import RefundDialog from './RefundDialog';

export default function PaymentLogsPage() {
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter) f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, search]);

  const { data, loading, refetch } = useQuery(PAYMENTS, {
    variables: { filter, limit: 200 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
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

  const apollo = useApolloClient();
  const [refundMut, { loading: refundLoading }] = useMutation(REFUND_PAYMENT);
  const [refundFor, setRefundFor] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadInvoice = async (p: any) => {
    if (!p.invoice_no) return;
    setActionError(null);
    setDownloadingId(p.id);
    try {
      const { data: pdfData } = await apollo.query({
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
  };

  const handleConfirmRefund = async () => {
    if (!refundFor) return;
    setActionError(null);
    try {
      await refundMut({ variables: { id: refundFor.id, reason: refundReason || null } });
      setRefundFor(null);
      setRefundReason('');
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
        <Tooltip title="Refresh">
          <IconButton onClick={() => refetch()}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      <TotalsCards totals={totals} />

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="PENDING">Pending</MenuItem>
          <MenuItem value="SUCCESS">Success</MenuItem>
          <MenuItem value="FAILED">Failed</MenuItem>
          <MenuItem value="REFUNDED">Refunded</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Search (txn id, invoice, name, email)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1 }}
        />
      </Stack>

      <PaymentsTable
        loading={loading}
        hasData={!!data}
        items={items}
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
