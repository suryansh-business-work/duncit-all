import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { EarningsSplitView } from '@duncit/ui';
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

  const { data, loading, error } = useQuery<any>(POD_SETTLEMENT_PREVIEW, {
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
          {/* Apollo 4 hands back ONE error whose message already carries the
              server's reason. */}
          {error?.message ?? 'Preview unavailable.'}
        </Typography>
      );
    }
    // The same four-way split (host first) as every other pod money view.
    return (
      <Stack spacing={1}>
        <EarningsSplitView waterfall={s.waterfall} symbol={s.currency_symbol} viewer="staff" />
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t('admin.completePod.payoutNote')}
        </Typography>
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
        {t('admin.completePod.previewTitle')}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
