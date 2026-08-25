import { useEffect } from 'react';
import { IconButton, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
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
 * A stepper rather than a dropdown: a pod may have every one of its remaining
 * seats bought in a single booking, and a virtual pod can be sized in the
 * thousands, so a menu listing one item per seat is a page that stops
 * responding. It is also the control the native twin already uses (rule 27) and
 * the one the product-quantity picker uses on both surfaces.
 *
 * Hidden when only one seat is left: a picker with a single option is furniture.
 */
export default function SeatPicker({ value, onChange, maxSeats, disabled }: Readonly<Props>) {
  const { t } = useTranslation();
  const top = Math.max(0, Math.floor(maxSeats) || 0);
  const seats = Math.min(Math.max(value, 1), Math.max(top, 1));
  // Clamping only what is DISPLAYED left the parent holding the larger number,
  // so a stepper showing 3 could submit 5 and the pod would reject the booking
  // after the buyer had filled in the whole checkout form. Tell the parent.
  useEffect(() => {
    if (seats !== value) onChange(seats);
  }, [seats, value, onChange]);
  if (top <= 1) return null;

  const step = (next: number) => onChange(Math.min(Math.max(next, 1), top));

  return (
    <Stack
      direction="row"
      role="group"
      aria-label={t('mweb.podDetails.numberOfSeats')}
      sx={{
        alignItems: "center",
        flex: '0 0 auto',
        height: 48,
        borderRadius: 999,
        border: 1,
        borderColor: 'divider',
        opacity: disabled ? 0.6 : 1
      }}>
      <IconButton
        aria-label={t('mweb.podDetails.oneSeatFewer')}
        onClick={() => step(seats - 1)}
        disabled={disabled || seats <= 1}
        size="small"
        sx={{ width: 38 }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          minWidth: 18,
          textAlign: 'center'
        }}>
        {seats}
      </Typography>
      <IconButton
        aria-label={t('mweb.podDetails.oneSeatMore')}
        onClick={() => step(seats + 1)}
        disabled={disabled || seats >= top}
        size="small"
        sx={{ width: 38 }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
