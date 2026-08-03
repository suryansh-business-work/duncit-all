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
      paying_attendees
      waterfall {
        version
        amount
        gst_pct
        gst_amount
        net_amount
        platform_fee_pct
        platform_fee_amount
        pool_amount
        venue_amount
        venue_commission_pct
        venue_commission_amount
        venue_receives
        host_amount
        host_commission_pct
        host_commission_amount
        host_receives
        duncit_revenue
        host_earn_pct
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
      <Typography variant="body2" sx={{ fontWeight: line.strong ? 700 : 600 }}>
        {line.label}
      </Typography>
      <Typography variant="body2" color={line.strong ? 'success.main' : 'text.primary'} sx={{ fontWeight: line.strong ? 700 : 600 }}>
        {symbol}
        {line.value.toFixed(2)}
      </Typography>
    </Stack>
  );
}

/** Waterfall lines for the settlement — venue rows only when the pod has one. */
function settlementLines(s: PodSettlement): Line[] {
  const w = s.waterfall;
  const venueLines: Line[] = s.has_venue
    ? [
        { label: 'Venue slot price', value: w.venue_amount },
        { label: 'Venue receives', value: w.venue_receives },
      ]
    : [];
  return [
    { label: 'Customer Paid', value: w.amount },
    { label: `− GST (${w.gst_pct}%)`, value: w.gst_amount },
    { label: `− Platform Fee (${w.platform_fee_pct}%)`, value: w.platform_fee_amount },
    { label: 'Pool', value: w.pool_amount },
    ...venueLines,
    { label: 'You receive', value: w.host_receives, strong: true },
    { label: 'Duncit revenue', value: w.duncit_revenue },
  ];
}

/** Live "Host Share" preview — the finance-engine waterfall for this pod. */
export default function SettlementPreview({ podId, venueBillAmount }: Readonly<Props>) {
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const t = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(t);
  }, [venueBillAmount]);

  const { data, loading, error } = useQuery(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount },
    fetchPolicy: 'cache-and-network',
  });

  const s: PodSettlement | undefined = data?.podSettlementPreview;

  const body = () => {
    if (!s) {
      if (loading) return <CircularProgress size={18} />;
      // Show the server's reason instead of silently hiding the calculation.
      return (
        <Typography variant="caption" color={error ? 'error' : 'text.secondary'} data-testid="settlement-preview-error">
          {error?.graphQLErrors[0]?.message ?? error?.message ?? 'Enter a bill to preview your share.'}
        </Typography>
      );
    }
    return (
      <Stack spacing={0.5}>
        {/* The head count these figures come from. A completed pod settles on
            what it actually collected, so this is real attendance, not the
            spots the host planned for — and their own seat was free. */}
        <Typography variant="caption" color="text.secondary" data-testid="settlement-attendees">
          Based on {s.paying_attendees} paying{' '}
          {s.paying_attendees === 1 ? 'attendee' : 'attendees'} — your own spot is free.
        </Typography>
        {settlementLines(s).map((line) => (
          <Row key={line.label} symbol={s.currency_symbol} line={line} />
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.08)' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
        Your share (credited to your wallet on completion)
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
