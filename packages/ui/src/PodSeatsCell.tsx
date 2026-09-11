import { Box, Tooltip, Typography } from '@mui/material';
import { useTranslation } from './i18n/useTranslation';

interface Props {
  /** Seats held, every extra seat of a multi-seat booking included. */
  seats: number;
  /** Bookings behind those seats — one per person, hosts included. */
  bookings: number;
  /** Declared capacity. 0 (or omitted) means the pod set none. */
  total?: number | null;
}

/**
 * How full a pod is, and how many bookings hold it.
 *
 * `pod_attendees` is an IDENTITY list — a booking for seven seats writes ONE id
 * into it, because duplicating the id there would corrupt chat access,
 * permissions and audience fan-outs — so the seats past the buyer's own live in
 * `Pod.extra_seats`. Every table that counted the list reported a sold-out pod
 * as nearly empty.
 *
 * Both numbers, together, in one cell: the seat count says whether the pod is
 * full, the booking count says how many people that is. Reading either without
 * the other is what made `1 + 7 + 2 = 10 seats` show up as "3".
 *
 * Shared rather than copied because admin's Pods table, the Partners pods list
 * and the Become-a-Host list all answer the same question, and three copies is
 * three chances for them to disagree about the same pod (rule 40).
 */
export default function PodSeatsCell({ seats, bookings, total }: Readonly<Props>) {
  const { t } = useTranslation();
  const capacity = total ?? 0;
  const extra = Math.max(seats - bookings, 0);
  const hintKey = extra > 0 ? 'ui.podSeats.hintMulti' : 'ui.podSeats.hint';
  return (
    <Tooltip title={t(hintKey, { vars: { seats, bookings, extra } })}>
      <Box sx={{ lineHeight: 1.2 }}>
        <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
          {capacity > 0 ? `${seats} / ${capacity}` : seats}
        </Typography>
        <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
          {t('ui.podSeats.bookings', { count: bookings })}
        </Typography>
      </Box>
    </Tooltip>
  );
}
