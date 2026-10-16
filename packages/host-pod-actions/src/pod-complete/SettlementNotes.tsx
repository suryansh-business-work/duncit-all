import { Divider, Stack, Typography } from '@mui/material';
import AttendanceRoster from './AttendanceRoster';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlement, PodSettlementAttendee } from '../types';

/** The head-count note under the roster — the seats these figures come from. */
export function AttendanceNote({ settlement }: Readonly<{ settlement: PodSettlement }>) {
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
export function FreeSettlement({
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
