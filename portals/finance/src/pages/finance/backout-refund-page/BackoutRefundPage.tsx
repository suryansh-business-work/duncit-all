import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Box, Stack, Typography } from '@mui/material';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import BackoutRefundTable from './BackoutRefundTable';
import RefundBreakupDialog from './RefundBreakupDialog';
import {
  BACKOUT_FINANCE_SETTINGS,
  BACKOUT_REFUNDS_TABLE,
  PROCESS_BACKOUT_REFUND,
  type BackoutRefundRequest,
  type RefundPart,
} from './queries';
import { useTranslation } from '@duncit/app-settings';

interface SettingsData {
  publicFinanceSettings: { currency_symbol: string; default_backout_deduction_pct: number };
}

export default function BackoutRefundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data, error } = useQuery<SettingsData>(BACKOUT_FINANCE_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [processRefund, { loading: refunding }] = useMutation<
    { processBackoutRefund: BackoutRefundRequest },
    { id: string; part: RefundPart }
  >(PROCESS_BACKOUT_REFUND);
  const [refundFor, setRefundFor] = useState<BackoutRefundRequest | null>(null);

  const sym = data?.publicFinanceSettings?.currency_symbol ?? '';
  const deductionPct = data?.publicFinanceSettings?.default_backout_deduction_pct ?? 0;

  const fetchRows = useApolloTableFetch<BackoutRefundRequest>(
    client,
    BACKOUT_REFUNDS_TABLE,
    'backoutRefundRequestsTable',
  );

  // Processes ONE part of the selected Spot Filled request's refund. The dialog
  // stays open on the updated row while other parts are outstanding, and closes
  // once the last one lands; the table refreshes either way. The dialog passes
  // its (non-null) row back, so no null guard is needed here.
  const confirmRefund = async (row: BackoutRefundRequest, part: RefundPart) => {
    try {
      const { data: result } = await processRefund({ variables: { id: row.id, part } });
      const updated = result?.processBackoutRefund ?? null;
      const finished = !updated || updated.pending_refund_parts.length === 0;
      setRefundFor(finished ? null : updated);
      notifySuccess(
        finished
          ? t('finance.backoutRefund.refundCompleted')
          : t('finance.backoutRefund.refundPartProcessed'),
      );
      refetchRef.current?.();
    } catch (e) {
      notifyError(parseApiError(e));
    }
  };

  const openDetail = useCallback(
    (row: BackoutRefundRequest) => navigate(`/backout-refunds/${row.id}`),
    [navigate],
  );

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          alignItems: "center",
          mb: 3
        }}>
        <RequestQuoteIcon color="primary" />
        <Box>
          <Typography component="h1" variant="h5" sx={{
            fontWeight: 700
          }}>{t('finance.backoutRefund.backoutRefunds')}</Typography>
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            Every Backout request with its lifecycle status — refunds unlock once the spot is filled.
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
        busy={refunding}
        onClose={() => setRefundFor(null)}
        onConfirm={confirmRefund}
      />
    </Box>
  );
}
