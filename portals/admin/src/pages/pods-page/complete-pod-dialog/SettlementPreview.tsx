import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import type { SettlementPreviewProps } from './complete-pod.types';

interface Line {
  label: string;
  value: number;
  strong?: boolean;
}

function PreviewRow({ symbol, line }: Readonly<{ symbol: string; line: Line }>) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" sx={{ fontWeight: line.strong ? 900 : 600 }}>
        {line.label}
      </Typography>
      <Typography
        variant="body2"
        color={line.strong ? 'primary.main' : 'text.primary'}
        sx={{ fontWeight: line.strong ? 900 : 700 }}
      >
        {symbol}
        {line.value.toFixed(2)}
      </Typography>
    </Stack>
  );
}

/** Live "Host Share" preview of the reconciled split for the entered venue bill. */
export default function SettlementPreview({ podId, venueBillAmount }: Readonly<SettlementPreviewProps>) {
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const timer = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(timer);
  }, [venueBillAmount]);

  const { data, loading } = useQuery(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount },
    fetchPolicy: 'cache-and-network',
  });
  const s = data?.podSettlementPreview;

  const body = () => {
    if (!s) {
      return loading ? <CircularProgress size={18} /> : (
        <Typography variant="caption" color="text.secondary">
          Enter a bill to preview the split.
        </Typography>
      );
    }
    const lines: Line[] = [
      { label: 'Total collected', value: s.collected_total },
      { label: 'Venue bill', value: s.host.venue_bill },
      { label: `GST (${s.host.gst_pct}%)`, value: s.host.gst_amount },
      { label: `Duncit Taken (${s.host.duncit_pct}%)`, value: s.host.duncit_amount },
      { label: `Host Commission (${s.host.payout_pct}%)`, value: s.host.payout_amount, strong: true },
    ];
    return (
      <Stack spacing={0.5}>
        {lines.map((line) => (
          <PreviewRow key={line.label} symbol={s.currency_symbol} line={line} />
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
        Settlement preview (after Finance approval)
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
