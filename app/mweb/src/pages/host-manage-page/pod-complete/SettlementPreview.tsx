import { useEffect, useState } from 'react';
import { gql, useQuery } from '@apollo/client';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import AttendanceRoster from './AttendanceRoster';
import type { PodSettlement } from './pod-complete.types';

export const POD_SETTLEMENT_PREVIEW = gql`
  query PodSettlementPreview($pod_id: ID!, $venue_bill_amount: Float!) {
    podSettlementPreview(pod_id: $pod_id, venue_bill_amount: $venue_bill_amount) {
      currency_symbol
      collected_total
      has_venue
      paying_attendees
      attended_seats
      booked_seats
      attended_total
      attendees {
        membership_id
        user_id
        name
        seats
        attended
        attended_at
        amount
      }
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
  /** Opens the ticket scanner for this pod. Attendance is only ever created by
   * scanning a ticket, so the roster's action defers to the host's scanner. */
  onScan: () => void;
  /** Changes after each scanner session — re-reads the settlement so a newly
   * scanned guest is reflected in both the roster and the payout. */
  refreshToken: number;
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
export default function SettlementPreview({
  podId,
  venueBillAmount,
  onScan,
  refreshToken,
}: Readonly<Props>) {
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const t = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(t);
  }, [venueBillAmount]);

  const { data, loading, error, refetch } = useQuery(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount },
    fetchPolicy: 'cache-and-network',
  });

  // A scanner session may have checked somebody in. The settlement is computed
  // from exactly that, so re-read it rather than showing a stale payout.
  useEffect(() => {
    if (refreshToken > 0) refetch().catch(() => undefined);
  }, [refreshToken, refetch]);

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
      <Stack spacing={1}>
        <AttendanceRoster
          attendees={s.attendees ?? []}
          attendedSeats={s.attended_seats}
          bookedSeats={s.booked_seats}
          symbol={s.currency_symbol}
          onScan={onScan}
        />
        <Divider />
        {/* The head count these figures come from. The payout is computed from
            the SCANNED seats — a booking nobody checked in is not part of it,
            even though its money was collected and is not refunded. */}
        <Typography variant="caption" color="text.secondary" data-testid="settlement-attendees">
          Based on {s.attended_seats} attended{' '}
          {s.attended_seats === 1 ? 'seat' : 'seats'} of {s.booked_seats} booked — your own spot is
          free.
        </Typography>
        {s.attended_seats < s.booked_seats && (
          <Typography variant="caption" color="text.secondary">
            {s.currency_symbol}
            {(s.collected_total - s.attended_total).toFixed(2)} was collected from seats nobody
            scanned in, so it is not part of this payout.
          </Typography>
        )}
        {settlementLines(s).map((line) => (
          <Row key={line.label} symbol={s.currency_symbol} line={line} />
        ))}
        {s.waterfall.host_receives < 0 && (
          <Typography variant="caption" color="error" data-testid="settlement-shortfall">
            The venue&apos;s booked price is more than this pod took at the door. The venue is paid
            in full and your share is nil — it is never taken back from you.
          </Typography>
        )}
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
