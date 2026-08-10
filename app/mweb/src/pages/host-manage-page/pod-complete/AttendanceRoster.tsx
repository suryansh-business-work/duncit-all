import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Alert, Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import type { PodSettlementAttendee } from './pod-complete.types';

interface Props {
  attendees: PodSettlementAttendee[];
  attendedSeats: number;
  bookedSeats: number;
  symbol: string;
  /** Opens the ticket scanner. Marking is a SCAN, never a free toggle. */
  onScan: () => void;
}

const money = (symbol: string, amount: number) => `${symbol}${Number(amount || 0).toFixed(2)}`;

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
  const attended = attendees.filter((a) => a.attended);
  const pending = attendees.filter((a) => !a.attended);

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
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
          <Typography variant="caption" color="text.secondary">
            Not marked yet — their seats are not part of the payout below.
          </Typography>
          <Stack spacing={0.75}>
            {pending.map((row) => (
              <RosterRow key={row.membership_id} row={row} symbol={symbol} onScan={onScan} />
            ))}
          </Stack>
        </>
      )}

      {attendees.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          Nobody booked this pod.
        </Typography>
      )}
    </Stack>
  );
}

interface RowProps {
  row: PodSettlementAttendee;
  symbol: string;
  /** Present only on a not-yet-marked row. */
  onScan?: () => void;
}

/** One booking: who, how many seats, what it paid, and its scan action. */
function RosterRow({ row, symbol, onScan }: Readonly<RowProps>) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        px: 1.25,
        py: 1,
        borderRadius: 2,
        border: 1,
        borderColor: 'divider',
        opacity: row.attended ? 1 : 0.85,
      }}
    >
      {row.attended ? (
        <CheckCircleIcon fontSize="small" color="success" />
      ) : (
        <RadioButtonUncheckedIcon fontSize="small" color="disabled" />
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
          {row.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.seats === 1 ? '1 seat' : `${row.seats} seats`} · {money(symbol, row.amount)}
        </Typography>
      </Box>
      {onScan && (
        <Button size="small" startIcon={<QrCodeScannerIcon />} onClick={onScan} sx={{ fontWeight: 700 }}>
          Scan
        </Button>
      )}
    </Stack>
  );
}
