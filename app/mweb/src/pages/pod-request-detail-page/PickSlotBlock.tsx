import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import { DuncitButton } from '@duncit/buttons';
import PillChips from '../../components/club-admin/PillChips';
import SlotPicker from '../create-pod-page/create-pod/SlotPicker';
import { VENUE_AVAILABLE_SLOTS } from '../create-pod-page/create-pod/venueSlots';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  venueId: string;
  busy: boolean;
  /** Resolves true once the slot request is sent. */
  onSend: (slotId: string) => Promise<boolean>;
}

/**
 * The receiver picks one of the venue's open slots — the same calendar Create
 * Pod uses, one space at a time when the venue sells several — and sends it
 * for the other side to confirm.
 */
export default function PickSlotBlock({ venueId, busy, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const [slotId, setSlotId] = useState('');
  const [space, setSpace] = useState<string | null>(null);
  const slotsQuery = useQuery(VENUE_AVAILABLE_SLOTS, {
    variables: { venue_id: venueId },
    fetchPolicy: 'cache-and-network',
  });
  const slots = useMemo(() => slotsQuery.data?.venueAvailableSlots ?? [], [slotsQuery.data]);
  const spaces = useMemo(() => [...new Set(slots.map((slot) => slot.space_label ?? ''))], [slots]);
  const activeSpace = space ?? spaces[0] ?? '';
  const spaceSlots = slots.filter((slot) => (slot.space_label ?? '') === activeSpace);
  const spaceOptions = spaces.map((value) => ({ value, label: value || t('mweb.slots.wholeVenue') }));
  const noSlots = !slotsQuery.loading && slots.length === 0;

  return (
    <Stack spacing={2} data-testid="pod-request-pick-slot">
      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
        {t('podRequests.pickSlot')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('podRequests.pickSlotHint')}
      </Typography>
      {slotsQuery.error && <Alert severity="error">{slotsQuery.error.message}</Alert>}
      {noSlots && !slotsQuery.error && <Alert severity="info">{t('podRequests.noSlots')}</Alert>}
      {spaces.length > 1 && (
        <PillChips
          label={t('mweb.createPod.spaceCapacity')}
          options={spaceOptions}
          value={activeSpace}
          onChange={(next) => {
            setSpace(next);
            setSlotId('');
          }}
        />
      )}
      {!noSlots && (
        <SlotPicker
          slots={spaceSlots}
          loading={slotsQuery.loading && !slotsQuery.data}
          selectedSlotId={slotId}
          onPick={(slot) => setSlotId(slot.id)}
          required
        />
      )}
      <DuncitButton
        variant="contained"
        size="large"
        startIcon={<SendRoundedIcon />}
        disabled={!slotId}
        loading={busy}
        onClick={() => {
          onSend(slotId).catch(() => undefined);
        }}
        data-testid="pod-request-send-slot"
      >
        {t('podRequests.sendSlot')}
      </DuncitButton>
    </Stack>
  );
}
