import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { FinanceWaterfallList, buildWaterfallLines } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import type { SettlementPreviewProps } from './complete-pod.types';

/** Live waterfall preview of the settlement for the pod being completed. */
export default function SettlementPreview({ podId, venueBillAmount, hostUserId }: Readonly<SettlementPreviewProps>) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const timer = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(timer);
  }, [venueBillAmount]);

  const { data, loading, error } = useQuery(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount, host_user_id: hostUserId || null },
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.podSettlementPreview;

  const body = () => {
    if (!s) {
      if (loading) return <CircularProgress size={18} />;
      // Never swallow the server's reason — a hidden error here is exactly how
      // "the calculation doesn't appear" bugs are born.
      return (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'}>
          {error?.graphQLErrors[0]?.message ?? error?.message ?? 'Preview unavailable.'}
        </Typography>
      );
    }
    const lines = buildWaterfallLines(s.waterfall, s.currency_symbol, s.has_venue, t, s.collected_total);
    return (
      <Stack spacing={1}>
        <FinanceWaterfallList symbol={s.currency_symbol} lines={lines} />
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          Payouts are credited to the beneficiary wallets when the pod is completed.
        </Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
        Settlement preview
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
