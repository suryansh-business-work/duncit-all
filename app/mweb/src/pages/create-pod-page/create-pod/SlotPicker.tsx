import { useMemo } from 'react';
import { useDateFormat } from '@duncit/app-settings';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/mui';
import { useTranslation } from '../../../i18n/useTranslation';
import type { CreatePodSlot } from './create-pod.types';

interface Props {
  slots: CreatePodSlot[];
  loading: boolean;
  selectedSlotId: string;
  onPick: (slot: CreatePodSlot) => void;
  error?: string;
  required?: boolean;
}

/**
 * Pick the venue slot that sets the pod's date & time — a calendar, then the
 * times on the chosen day. A thin wrapper so this file keeps the shape its call
 * sites already pass; the calendar itself is shared with the portals and the
 * app, which is what keeps the three surfaces identical.
 */
export default function SlotPicker({
  slots,
  loading,
  selectedSlotId,
  onPick,
  error,
  required,
}: Readonly<Props>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();
  const labels = useMemo(() => buildSlotLabels(t, 'mweb.slots'), [t]);

  // The step above already narrows to one space, so no caption is needed here —
  // every tile on a day belongs to the same space.
  const calendarSlots = useMemo(
    () => slots.map((slot) => ({ id: slot.id, start_at: slot.start_at, end_at: slot.end_at, price: slot.price })),
    [slots],
  );

  return (
    <SlotCalendar
      slots={calendarSlots}
      loading={loading}
      error={error}
      selectedSlotId={selectedSlotId}
      onPick={(picked) => {
        const original = slots.find((slot) => slot.id === picked.id);
        if (original) onPick(original);
      }}
      fmt={fmt}
      labels={labels}
      required={required}
    />
  );
}
