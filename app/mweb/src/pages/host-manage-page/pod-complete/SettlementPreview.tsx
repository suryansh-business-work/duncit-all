import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import type { PodSettlement } from './pod-complete.types';

export const POD_SETTLEMENT_PREVIEW = gql`
  query PodSettlementPreview($pod_id: ID!, $venue_bill_amount: Float!) {
    podSettlementPreview(pod_id: $pod_id, venue_bill_amount: $venue_bill_amount) {
      currency_symbol
      collected_total
      has_venue
      host {
        venue_bill
        gst_pct
        gst_amount
        duncit_pct
        duncit_amount
        payout_pct
        payout_amount
      }
    }
  }
`;

interface Props {
  podId: string;
  venueBillAmount: number;
}

interface Line {
  label: string;
  value: number;
  strong?: boolean;
}

function Row({ symbol, line }: Readonly<{ symbol: string; line: Line }>) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" sx={{ fontWeight: line.strong ? 900 : 600 }}>
        {line.label}
      </Typography>
      <Typography variant="body2" color={line.strong ? 'primary.main' : 'text.primary'} sx={{ fontWeight: line.strong ? 900 : 700 }}>
        {symbol}
        {line.value.toFixed(2)}
      </Typography>
    </Stack>
  );
}

/** Live "Host Share" preview of the reconciled split for the entered venue bill. */
export default function SettlementPreview({ podId, venueBillAmount }: Readonly<Props>) {
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const t = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(t);
  }, [venueBillAmount]);

  const { data, loading } = useQuery(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount },
    fetchPolicy: 'cache-and-network',
  });

  const s: PodSettlement | undefined = data?.podSettlementPreview;

  const body = () => {
    if (!s) {
      return loading ? <CircularProgress size={18} /> : <Typography variant="caption" color="text.secondary">Enter a bill to preview your share.</Typography>;
    }
    const lines: Line[] = [
      { label: 'Total collected', value: s.collected_total },
      { label: 'Venue bill', value: s.host.venue_bill },
      { label: `GST (${s.host.gst_pct}%)`, value: s.host.gst_amount },
      { label: `Duncit Taken (${s.host.duncit_pct}%)`, value: s.host.duncit_amount },
      { label: `Your Commission (${s.host.payout_pct}%)`, value: s.host.payout_amount, strong: true },
    ];
    return (
      <Stack spacing={0.5}>
        {lines.map((line) => (
          <Row key={line.label} symbol={s.currency_symbol} line={line} />
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 0.5 }}>
        Your share (after Finance approval)
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
