import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import {
  attendanceProgress,
  type PodAttendanceBoard,
  type PodAttendanceLabels,
} from '@duncit/utils';

/**
 * How far through the roster the host is.
 *
 * Seats, not people: one booking can admit four, and "3 of 12 marked" meaning
 * bookings while the payout counts seats is exactly the mismatch that made the
 * old settlement figure look wrong. Both numbers are shown, with seats carrying
 * the bar.
 */
export default function AttendanceSummary({
  board,
  labels,
}: Readonly<{ board: PodAttendanceBoard; labels: PodAttendanceLabels }>) {
  const percent = attendanceProgress(board);
  const complete = board.total_count > 0 && board.marked_count === board.total_count;

  return (
    <Stack spacing={0.75} data-testid="attendance-summary">
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1
        }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {labels.summary(board.marked_count, board.total_count)}
        </Typography>
        <Chip
          size="small"
          color={complete ? 'success' : 'default'}
          label={labels.seatsSummary(board.marked_seats, board.total_seats)}
          sx={{ fontWeight: 700 }}
        />
      </Stack>
      <LinearProgress
        variant="determinate"
        value={percent}
        color={complete ? 'success' : 'primary'}
        aria-label={labels.pageTitle}
        sx={{ height: 8, borderRadius: 999 }}
      />
    </Stack>
  );
}
