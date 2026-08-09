import { useEffect } from 'react';
import { MenuItem, TextField } from '@mui/material';
import { seatOptions } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

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
  const { t } = useTranslation();
  const options = seatOptions(maxSeats);
  // Clamping only what is DISPLAYED left the parent holding the larger number,
  // so a picker showing 3 could submit 5 and the pod would reject the booking
  // after the buyer had filled in the whole checkout form. Tell the parent.
  const capped = options.length > 0 ? Math.min(value, options.length) : value;
  useEffect(() => {
    if (capped !== value) onChange(capped);
  }, [capped, value, onChange]);
  if (options.length <= 1) return null;
  return (
    <TextField
      select
      size="small"
      label={t('mweb.podDetails.seats')}
      value={capped}
      onChange={(event) => onChange(Number(event.target.value))}
      disabled={disabled}
      sx={{ width: 96, flex: '0 0 auto' }}
      inputProps={{ 'aria-label': t('mweb.podDetails.numberOfSeats') }}
    >
      {options.map((count) => (
        <MenuItem key={count} value={count}>
          {count}
        </MenuItem>
      ))}
    </TextField>
  );
}
