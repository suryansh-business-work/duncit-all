import { Stack, Typography } from '@mui/material';
import type {
  PodAttendanceLabels,
  PodAttendanceRow as AttendanceRowData,
  PodAttendanceViewer,
} from '@duncit/utils';
import AttendanceRow from './AttendanceRow';

/**
 * One list section — marked, or still to do.
 *
 * Its own file rather than a second component inside the page: the page is at
 * the 200-line ceiling the project sets for a `.tsx`, and this is the part of
 * it that is genuinely reusable between the two lists.
 */
export default function RosterSection({
  testID,
  heading,
  rows,
  labels,
  canMark,
  viewer,
  busyId,
  formatDateTime,
  onMark,
}: Readonly<{
  /** Distinct per list — the page renders the unmarked and the marked roster. */
  testID: string;
  heading: string;
  rows: AttendanceRowData[];
  labels: PodAttendanceLabels;
  canMark: boolean;
  viewer: PodAttendanceViewer;
  busyId: string;
  formatDateTime: (iso: string) => string;
  onMark?: (row: AttendanceRowData) => void;
}>) {
  if (rows.length === 0) return null;
  return (
    <Stack spacing={1} data-testid={testID}>
      <Typography
        variant="overline"
        data-testid={`${testID}-count`}
        sx={{ fontWeight: 800, color: 'text.secondary' }}
      >
        {heading} · {rows.length}
      </Typography>
      {rows.map((row) => (
        <AttendanceRow
          key={row.membership_id}
          row={row}
          labels={labels}
          canMark={canMark}
          viewer={viewer}
          busy={busyId === row.membership_id}
          formatDateTime={formatDateTime}
          onMark={onMark}
        />
      ))}
    </Stack>
  );
}
