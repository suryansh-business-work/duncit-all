import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { EarningsSplitView, VenueBillSummary } from '@duncit/ui';
import { buildVenueBillLines } from '@duncit/utils';
import AttendanceRoster from './AttendanceRoster';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlement, PodSettlementAttendee } from '../types';

interface Props {
  podId: string;
  venueBillAmount: number;
  /** The bill is paid on top of the booked slot price rather than instead of it. */
  includeSlotPrice: boolean;
  /** Opens the ticket scanner for this pod. Attendance is only ever created by
   * scanning a ticket, so the roster's action defers to the host's scanner. */
  onScan: () => void;
  /** Changes after each scanner session — re-reads the settlement so a newly
   * scanned guest is reflected in both the roster and the payout. */
  refreshToken: number;
  /** The pod is FREE: there is no payout to preview, only the roster. The
   * settlement's own `is_free` says the same once it has loaded. */
  free?: boolean;
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
      <Typography variant="caption" data-testid="settlement-attendees" sx={{
        color: "text.secondary"
      }}>
        Based on {settlement.attended_seats} attended {seatWord} of {settlement.booked_seats} booked
        — your own spot is free.
      </Typography>
      {settlement.attended_seats < settlement.booked_seats && (
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {settlement.currency_symbol}
          {unscanned.toFixed(2)} was collected from seats nobody scanned in, so it is not part of
          this payout.
        </Typography>
      )}
    </>
  );
}

/** A free pod's preview: who was scanned in (attendance still gates completion)
 * and why there is no money in it — never a row of zeros. */
function FreeSettlement({
  attendees,
  settlement,
  onScan,
}: Readonly<{ attendees: PodSettlementAttendee[]; settlement: PodSettlement; onScan: () => void }>) {
  const { labels } = useHostPodActionsConfig();
  return (
    <Stack spacing={1}>
      <AttendanceRoster
        attendees={attendees}
        attendedSeats={settlement.attended_seats}
        bookedSeats={settlement.booked_seats}
        symbol={settlement.currency_symbol}
        showAmounts={false}
        onScan={onScan}
      />
      <Divider />
      <Typography variant="caption" data-testid="settlement-free-note" sx={{ color: 'text.secondary' }}>
        {labels.shareFreeNote}
      </Typography>
    </Stack>
  );
}

/** Live "Host Share" preview — the finance-engine split for this pod. */
export default function SettlementPreview({
  podId,
  venueBillAmount,
  includeSlotPrice,
  onScan,
  refreshToken,
  free = false,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const [amount, setAmount] = useState(venueBillAmount);
  useEffect(() => {
    const timer = setTimeout(() => setAmount(venueBillAmount), 350);
    return () => clearTimeout(timer);
  }, [venueBillAmount]);

  const { data, loading, error, refetch } = useQuery<any>(POD_SETTLEMENT_PREVIEW, {
    variables: { pod_id: podId, venue_bill_amount: amount, include_slot_price: includeSlotPrice },
    fetchPolicy: 'cache-and-network',
  });

  // A scanner session may have checked somebody in. The settlement is computed
  // from exactly that, so re-read it rather than showing a stale payout.
  useEffect(() => {
    if (refreshToken > 0) refetch().catch(() => undefined);
  }, [refreshToken, refetch]);

  const settlement: PodSettlement | undefined = data?.podSettlementPreview;
  const isFree = free || !!settlement?.is_free;

  const body = () => {
    if (!settlement) {
      if (loading) return <CircularProgress size={18} data-testid="settlement-loading" />;
      // Show the server's reason instead of silently hiding the calculation.
      // Apollo 4 hands back ONE error whose message already carries the server's
      // reason (a GraphQL failure arrives as CombinedGraphQLErrors, formatted).
      const reason = error?.message ?? labels.sharePreviewHint;
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
    const attendees = settlement.attendees ?? [];
    if (isFree) return <FreeSettlement attendees={attendees} settlement={settlement} onScan={onScan} />;
    return (
      <Stack spacing={1}>
        <AttendanceRoster
          attendees={attendees}
          attendedSeats={settlement.attended_seats}
          bookedSeats={settlement.booked_seats}
          symbol={settlement.currency_symbol}
          onScan={onScan}
        />
        <Divider />
        <AttendanceNote settlement={settlement} />
        {/* What the venue's side comes to: the earlier slot price, the bill
            entered above and the total the split below takes off the pool. */}
        {settlement.has_venue && (
          <VenueBillSummary
            lines={buildVenueBillLines(
              {
                slot_price: settlement.venue_slot_price,
                bill: settlement.venue_bill,
                slot_included: settlement.include_slot_price,
                venue_amount: settlement.waterfall.venue_amount,
                attended_seats: settlement.attended_seats,
                booked_seats: settlement.booked_seats,
              },
              labels.venueBill,
              settlement.currency_symbol,
            )}
          />
        )}
        {/* The same four-way split (the host's earning first) as Create Pod
            and every portal. Where the release pays less than the engine's
            host figure — an expired window, or a host side below zero — the
            two notes below say so. */}
        <EarningsSplitView
          waterfall={settlement.waterfall}
          symbol={settlement.currency_symbol}
          viewer="host"
        />
        {settlement.complete_expired && (
          <Typography variant="caption" color="error" data-testid="settlement-expired">
            {labels.shareExpired}
          </Typography>
        )}
        {settlement.waterfall.host_receives < 0 && (
          <Typography variant="caption" color="error" data-testid="settlement-shortfall">
            {labels.shareShortfall}
          </Typography>
        )}
      </Stack>
    );
  };

  return (
    <Box
      data-testid="settlement-summary"
      sx={{ p: 1.5, borderRadius: '16px', bgcolor: 'rgba(255,79,115,0.08)' }}
    >
      <Typography
        variant="subtitle2"
        data-testid={isFree ? 'settlement-free' : undefined}
        sx={{ fontWeight: 700, mb: 0.5 }}
      >
        {isFree ? labels.shareFree : labels.shareTitle}
      </Typography>
      <Divider sx={{ mb: 1 }} />
      {body()}
    </Box>
  );
}
