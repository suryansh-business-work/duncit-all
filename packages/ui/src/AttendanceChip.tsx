import { Chip, Tooltip } from '@mui/material';

export interface PodAttendanceSummary {
  attended_seats: number;
  booked_seats: number;
  recorded: boolean;
}

interface Props {
  attendance?: PodAttendanceSummary | null;
  size?: 'small' | 'medium';
}

/**
 * A pod's door attendance as "N/M scanned".
 *
 * A completed pod is settled on the scanned seats, so this is the number the
 * payout stands on — which is why admin and Club Admin read it from the same
 * component rather than each formatting the pair themselves.
 *
 * "Not scanned" is deliberately its own state: a pod where nobody was scanned
 * (a virtual pod, or a host who never opened the scanner) is not a pod where
 * everybody was absent, and showing it as 0/12 would say exactly that.
 */
export default function AttendanceChip({ attendance, size = 'small' }: Readonly<Props>) {
  if (!attendance || attendance.booked_seats === 0) {
    return <Chip size={size} variant="outlined" label="—" />;
  }
  if (!attendance.recorded) {
    return (
      <Tooltip title="No ticket on this pod has been scanned yet">
        <Chip size={size} variant="outlined" color="warning" label="Not scanned" />
      </Tooltip>
    );
  }
  const full = attendance.attended_seats >= attendance.booked_seats;
  return (
    <Tooltip title="Seats scanned in at the door — a completed pod is settled on these">
      <Chip
        size={size}
        variant={full ? 'filled' : 'outlined'}
        color={full ? 'success' : 'info'}
        label={`${attendance.attended_seats}/${attendance.booked_seats} scanned`}
      />
    </Tooltip>
  );
}
