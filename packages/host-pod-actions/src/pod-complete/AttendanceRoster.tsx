import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodSettlementAttendee } from '../types';

const money = (symbol: string, amount: number) => `${symbol}${Number(amount || 0).toFixed(2)}`;

interface RowProps {
  row: PodSettlementAttendee;
  symbol: string;
}

/** One booking: who, how many seats and what it paid. Read-only — marking
 * lives on the attendance page now, and this list is the payout's evidence. */
function RosterRow({ row, symbol }: Readonly<RowProps>) {
  const seatsText = row.seats === 1 ? '1 seat' : `${row.seats} seats`;
  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{
        alignItems: "center",
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        opacity: row.attended ? 1 : 0.85
      }}>
      {row.attended ? (
        <CheckCircleIcon fontSize="small" color="success" />
      ) : (
        <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {seatsText} · {money(symbol, row.amount)}
        </Typography>
      </Box>
    </Stack>
  );
}

interface Props {
  attendees: PodSettlementAttendee[];
  attendedSeats: number;
  bookedSeats: number;
  symbol: string;
  /** Opens the ticket scanner. Marking is a SCAN, never a free toggle. */
  onScan: () => void;
}

/**
 * Who turned up, and who has not been scanned yet.
 *
 * The payout is computed from the attended rows only, so this list is the
 * settlement's evidence — a host reading a number they disagree with can see
 * exactly which booking it came from. The not-attended rows carry the scan
 * action: attendance is proof of arrival, so it is only ever created by
 * scanning that person's ticket. Scanning one moves it up and the settlement
 * above recomputes.
 */
export default function AttendanceRoster({
  attendees,
  attendedSeats,
  bookedSeats,
  symbol,
  onScan,
}: Readonly<Props>) {
  const { labels } = useHostPodActionsConfig();
  const attended = attendees.filter((a) => a.attended);
  const pending = attendees.filter((a) => !a.attended);

  return (
    <Stack spacing={1.5}>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1
        }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Attendance
        </Typography>
        <Chip
          size="small"
          color={attendedSeats > 0 ? 'success' : 'default'}
          label={`${attendedSeats} of ${bookedSeats} seats marked`}
        />
      </Stack>

      {attendedSeats === 0 && (
        <Alert severity="warning">
          Nobody has been scanned in yet, so this pod would settle at zero. Scan each guest&apos;s
          ticket to record who turned up.
        </Alert>
      )}

      {attended.length > 0 && (
        <Stack spacing={0.75}>
          {attended.map((row) => (
            <RosterRow key={row.membership_id} row={row} symbol={symbol} />
          ))}
        </Stack>
      )}

      {pending.length > 0 && (
        <>
          <Divider />
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Not marked yet — their seats are not part of the payout below.
          </Typography>
          <Stack spacing={0.75}>
            {pending.map((row) => (
              <RosterRow key={row.membership_id} row={row} symbol={symbol} />
            ))}
          </Stack>
          {/* ONE button, not one per row. Twelve unmarked bookings used to
              render twelve identical Scan buttons that all opened the same
              camera — and the native twin never had them at all (rule 27). */}
          <DuncitButton
            fullWidth
            startIcon={<QrCodeScannerIcon />}
            onClick={onScan}
            sx={{ fontWeight: 800, borderRadius: 999 }}
          >
            {labels.attendanceScanCta}
          </DuncitButton>
        </>
      )}

      {attendees.length === 0 && (
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Nobody booked this pod.
        </Typography>
      )}
    </Stack>
  );
}
