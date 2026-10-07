import { Card, Stack, Typography } from '@mui/material';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { useDateFormat } from '../../utils/dateFormat';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodRequestSlot } from '../pod-requests/queries';

interface Props {
  slot: PodRequestSlot;
}

/** The slot on the request — picked by the receiver, confirmed by the sender. */
export default function SlotSummary({ slot }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const when = slot.whole_day
    ? [fmt.formatDate(slot.start_at), t('mweb.slots.wholeDay')].join(' · ')
    : [fmt.formatDateTime(slot.start_at), fmt.formatTime(slot.end_at)].join(' – ');

  return (
    <Card sx={{ p: 2 }} data-testid="pod-request-slot">
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
        <EventRoundedIcon color="primary" />
        <Stack sx={{ minWidth: 0 }}>
          <Typography variant="overline" sx={{ color: 'text.secondary' }}>
            {t('podRequests.slotDetails')}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {when}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {slot.space_label || t('mweb.slots.wholeVenue')}
          </Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
