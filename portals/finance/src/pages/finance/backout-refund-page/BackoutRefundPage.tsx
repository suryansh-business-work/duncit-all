import { useState } from 'react';
import { useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Snackbar, Stack, Typography } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { parseApiError } from '../../../utils/parseApiError';
import BackoutRefundTable from './BackoutRefundTable';
import RefundBreakupDialog from './RefundBreakupDialog';
import { BACKOUT_REFUND_REQUESTS, type BackoutRefundRequest } from './queries';

interface QueryData {
  backoutRefundRequests: BackoutRefundRequest[];
  publicFinanceSettings: { currency_symbol: string };
}

export default function BackoutRefundPage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<QueryData>(BACKOUT_REFUND_REQUESTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [toast, setToast] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<BackoutRefundRequest | null>(null);

  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';
  const rows = data?.backoutRefundRequests ?? [];
  const showLoader = loading && rows.length === 0 && !error;
  const showEmpty = !loading && rows.length === 0 && !error;

  const confirmRefund = () => {
    setRefundFor(null);
    setToast('Refund successful');
  };

  return (
    <Box>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}>
        <RequestQuoteIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>Backout Refunds</Typography>
          <Typography variant="body2" color="text.secondary">
            Members who backed out of a paid pod — review and process their refunds.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{parseApiError(error)}</Alert>}
      {showLoader && (
        <Stack alignItems="center" sx={{ p: 4 }}><CircularProgress /></Stack>
      )}
      {showEmpty && <Alert severity="info">No backout refund requests yet.</Alert>}
      {rows.length > 0 && (
        <BackoutRefundTable
          rows={rows}
          sym={sym}
          onRowClick={(row) => navigate(`/backout-refunds/${row.id}`)}
          onRefund={(row) => setRefundFor(row)}
        />
      )}

      <RefundBreakupDialog
        refundFor={refundFor}
        sym={sym}
        onClose={() => setRefundFor(null)}
        onConfirm={confirmRefund}
      />

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
