import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/mui';
import { parseApiError } from '@duncit/utils';
import { POD_REQUEST_VENUE_SLOTS, type PodRequestSlot } from '../queries';

interface Props {
  venueId: string;
  busy: boolean;
  onSend: (slotId: string) => void;
}

/**
 * The receiving side picks one of the venue's open slots — the shared slot
 * calendar, narrowed to one space first when the venue rents out several.
 */
export default function SlotPickBlock({ venueId, busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const labels = useMemo(() => buildSlotLabels(t, 'shell.slots'), [t]);
  const [space, setSpace] = useState<string | null>(null);
  const [slotId, setSlotId] = useState('');
  const slotsQ = useQuery<{ venueAvailableSlots: PodRequestSlot[] }>(POD_REQUEST_VENUE_SLOTS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const slots = useMemo(() => slotsQ.data?.venueAvailableSlots ?? [], [slotsQ.data]);
  const spaces = useMemo(() => [...new Set(slots.map((slot) => slot.space_label))], [slots]);
  const activeSpace = space ?? spaces[0] ?? '';
  const shown = useMemo(
    () => (spaces.length > 1 ? slots.filter((slot) => slot.space_label === activeSpace) : slots),
    [slots, spaces.length, activeSpace],
  );
  const empty = !slotsQ.loading && !slotsQ.error && slots.length === 0;

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 700 }}>
        {t('podRequests.pickSlot')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('podRequests.pickSlotHint')}
      </Typography>
      {spaces.length > 1 && (
        <TextField
          select
          size="small"
          label={t('podRequests.spaceLabel')}
          value={activeSpace}
          onChange={(event) => {
            setSpace(event.target.value);
            setSlotId('');
          }}
          sx={{ maxWidth: 320 }}
        >
          {spaces.map((label) => (
            <MenuItem key={label} value={label}>
              {label || t('shell.slots.wholeVenue')}
            </MenuItem>
          ))}
        </TextField>
      )}
      {empty ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('podRequests.noSlots')}
        </Typography>
      ) : (
        <SlotCalendar
          slots={shown}
          loading={slotsQ.loading && !slotsQ.data}
          error={slotsQ.error ? parseApiError(slotsQ.error) : null}
          selectedSlotId={slotId}
          onPick={(slot) => setSlotId(slot.id)}
          fmt={fmt}
          labels={labels}
          required
        />
      )}
      <DuncitButton
        variant="contained"
        disabled={!slotId || busy}
        endIcon={<SendRoundedIcon />}
        onClick={() => onSend(slotId)}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('podRequests.sendSlot')}
      </DuncitButton>
    </Stack>
  );
}
