import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { EarningsSplitView, VenueBillSummary } from '@duncit/ui';
import { buildVenueBillLines } from '@duncit/utils';
import AttendanceRoster from './AttendanceRoster';
import { AttendanceNote, FreeSettlement } from './SettlementNotes';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlement, PodSettlementAttendee } from '../types';

interface Props {
  podId: string;
  venueBillAmount: number;
  /** The bill is paid on top of the booked slot price rather than instead of it. */
  includeSlotPrice: boolean;
  /** The venue's usage typed so far (guests charged for, overtime hours) — it prices the slot. */
  venueUsage?: { venue_pax?: number; overtime_hours?: number };
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

/** Live "Host Share" preview — the finance-engine split for this pod. */
export default function SettlementPreview({
  podId,
  venueBillAmount,
  includeSlotPrice,
  venueUsage,
  onScan,
  refreshToken,
  free = false,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  // The bill and the usage settle for a moment before the preview re-prices, not on every keystroke.
  const [typed, setTyped] = useState({ amount: venueBillAmount, usage: venueUsage });
  useEffect(() => {
    const timer = setTimeout(() => setTyped({ amount: venueBillAmount, usage: venueUsage }), 350);
    return () => clearTimeout(timer);
  }, [venueBillAmount, venueUsage]);
  const amount = typed.amount;

  const { data, loading, error, refetch } = useQuery<any>(POD_SETTLEMENT_PREVIEW, {
    variables: {
      pod_id: podId,
      venue_bill_amount: amount,
      include_slot_price: includeSlotPrice,
      ...typed.usage,
    },
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
