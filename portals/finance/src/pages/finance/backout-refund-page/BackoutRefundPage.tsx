import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { parseApiError } from '../../../utils/parseApiError';
import BackoutRefundTable from './BackoutRefundTable';
import RefundBreakupDialog from './RefundBreakupDialog';
import {
  BACKOUT_FINANCE_SETTINGS,
  BACKOUT_REFUNDS_TABLE,
  type BackoutRefundRequest,
} from './queries';

interface SettingsData {
  publicFinanceSettings: { currency_symbol: string; default_backout_deduction_pct: number };
}

export default function BackoutRefundPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, error } = useQuery<SettingsData>(BACKOUT_FINANCE_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [toast, setToast] = useState<string | null>(null);
  const [refundFor, setRefundFor] = useState<BackoutRefundRequest | null>(null);

  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';
  const deductionPct = data?.publicFinanceSettings?.default_backout_deduction_pct ?? 0;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data: page } = await client.query({
        query: BACKOUT_REFUNDS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: page.backoutRefundRequestsTable.rows as BackoutRefundRequest[],
        total: page.backoutRefundRequestsTable.total as number,
      };
    },
    [client],
  );

  const confirmRefund = () => {
    setRefundFor(null);
    setToast('Refund successful');
  };

  const openDetail = useCallback(
    (row: BackoutRefundRequest) => navigate(`/backout-refunds/${row.id}`),
    [navigate],
  );

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

      <BackoutRefundTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        sym={sym}
        onRowClick={openDetail}
        onRefund={setRefundFor}
      />

      <RefundBreakupDialog
        refundFor={refundFor}
        sym={sym}
        deductionPct={deductionPct}
        onClose={() => setRefundFor(null)}
        onConfirm={confirmRefund}
      />

      <Snackbar open={!!toast} autoHideDuration={2500} onClose={() => setToast(null)} message={toast || ''} />
    </Box>
  );
}
