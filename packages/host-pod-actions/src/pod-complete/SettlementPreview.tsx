import { useEffect, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Box, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import { EarningsSplitView } from '@duncit/ui';
import AttendanceRoster from './AttendanceRoster';
import { AttendanceNote, FreeSettlement } from './SettlementNotes';
import VenueSettlementSummary from './VenueSettlementSummary';
import { POD_SETTLEMENT_PREVIEW } from '../queries';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlement } from '../types';

interface Props {
  podId: string;
  /** The venue's final bill total as typed — the proof of the agreed amount. */
  venueBillAmount: number;
  /** Charges on the bill beyond the agreed amount, as the server takes them (`venueExtraAmountOf`). */
  venueExtraAmount: number;
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
  venueExtraAmount,
  venueUsage,
  onScan,
  refreshToken,
  free = false,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  // The bill, the extra charges and the usage settle for a moment before the
  // preview re-prices, not on every keystroke.
  const [typed, setTyped] = useState({ amount: venueBillAmount, extra: venueExtraAmount, usage: venueUsage });
  useEffect(() => {
    const timer = setTimeout(
      () => setTyped({ amount: venueBillAmount, extra: venueExtraAmount, usage: venueUsage }),
      350,
    );
    return () => clearTimeout(timer);
  }, [venueBillAmount, venueExtraAmount, venueUsage]);

  const { data, loading, error, refetch } = useQuery<any>(POD_SETTLEMENT_PREVIEW, {
    variables: {
      pod_id: podId,
      venue_bill_amount: typed.amount,
      // Always sent (0 included), never the old slot-price choice: the venue is
      // paid the agreed amount plus these, and the bill is the proof.
      venue_extra_amount: typed.extra,
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
        {/* What the venue's side comes to: the agreed terms, the bill entered
            above, any extra charges and the total the split below takes off the pool. */}
        {settlement.has_venue && <VenueSettlementSummary settlement={settlement} />}
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
