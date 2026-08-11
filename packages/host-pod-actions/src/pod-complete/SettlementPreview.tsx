import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { FinanceWaterfallList } from '@duncit/ui';
import AttendanceRoster from './AttendanceRoster';
import { buildHostShareLines } from './host-share-lines';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import type { PodSettlement } from '../types';

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

/** The head-count note under the roster — the seats these figures come from. */
function AttendanceNote({ settlement }: Readonly<{ settlement: PodSettlement }>) {
  const seatWord = settlement.attended_seats === 1 ? 'seat' : 'seats';
  const unscanned = settlement.collected_total - settlement.attended_total;
  return (
    <>
      {/* The payout is computed from the SCANNED seats — a booking nobody
          checked in is not part of it, even though its money was collected and
          is not refunded. */}
      <Typography variant="caption" color="text.secondary" data-testid="settlement-attendees">
        Based on {settlement.attended_seats} attended {seatWord} of {settlement.booked_seats} booked
        — your own spot is free.
      </Typography>
      {settlement.attended_seats < settlement.booked_seats && (
        <Typography variant="caption" color="text.secondary">
          {settlement.currency_symbol}
          {unscanned.toFixed(2)} was collected from seats nobody scanned in, so it is not part of
          this payout.
        </Typography>
      )}
    </>
  );
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
    const timer = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(timer);
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

  const settlement: PodSettlement | undefined = data?.podSettlementPreview;

  const body = () => {
    if (!settlement) {
      if (loading) return <CircularProgress size={18} />;
      // Show the server's reason instead of silently hiding the calculation.
      const reason =
        error?.graphQLErrors[0]?.message ?? error?.message ?? 'Enter a bill to preview your share.';
      return (
        <Typography
          variant="caption"
          color={error ? 'error' : 'text.secondary'}
          data-testid="settlement-preview-error"
        >
          {reason}
        </Typography>
      );
    }
    return (
      <Stack spacing={1}>
        <AttendanceRoster
          attendees={settlement.attendees ?? []}
          attendedSeats={settlement.attended_seats}
          bookedSeats={settlement.booked_seats}
          symbol={settlement.currency_symbol}
          onScan={onScan}
        />
        <Divider />
        <AttendanceNote settlement={settlement} />
        <FinanceWaterfallList
          symbol={settlement.currency_symbol}
          lines={buildHostShareLines(settlement)}
        />
        {settlement.waterfall.host_receives < 0 && (
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
