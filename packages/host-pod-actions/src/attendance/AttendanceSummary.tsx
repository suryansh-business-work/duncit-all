import { Chip, LinearProgress, Stack, Typography } from '@mui/material';
import {
  attendanceProgress,
  type PodAttendanceBoard,
  type PodAttendanceLabels,
} from '@duncit/utils';

/**
 * How far through the roster the host is.
 *
 * The headline counts PEOPLE. Eight seats bought on one account are eight
 * attendees, and counting the ROWS there read "1 of 1 attendees marked" over a
 * booking that admitted eight — the one number on the page the host checks
 * their payout against, saying the payout covers one seat. Seats are what the
 * settlement is split on, so they carry the bar too; the bookings count moves
 * beside it, because bookings are what the list below is made of.
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
          {labels.summary(board.marked_seats, board.total_seats)}
        </Typography>
        <Chip
          size="small"
          color={complete ? 'success' : 'default'}
          label={labels.bookingsSummary(board.marked_count, board.total_count)}
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
