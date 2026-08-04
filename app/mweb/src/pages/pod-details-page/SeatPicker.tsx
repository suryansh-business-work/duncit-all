import { MenuItem, TextField } from '@mui/material';
import { seatOptions } from '@duncit/utils';

interface Props {
  value: number;
  onChange: (seats: number) => void;
  /** Seats still bookable, from `podMembershipState.max_seats_per_booking`. */
  maxSeats: number;
  disabled?: boolean;
}

/**
 * How many seats this booking takes, shown beside the Pay/Join button. One
 * booking, one order, one ticket — the count only multiplies the ticket price
 * and the seats held.
 *
 * Hidden when only one seat is left: a picker with a single option is furniture.
 */
export default function SeatPicker({ value, onChange, maxSeats, disabled }: Readonly<Props>) {
  const options = seatOptions(maxSeats);
  if (options.length <= 1) return null;
  return (
    <TextField
      select
      size="small"
      label="Seats"
      value={Math.min(value, options.length)}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={disabled}
      sx={{ width: 96, flex: '0 0 auto' }}
      inputProps={{ 'aria-label': 'Number of seats' }}
    >
      {options.map((count) => (
        <MenuItem key={count} value={count}>
          {count}
        </MenuItem>
      ))}
    </TextField>
  );
}
