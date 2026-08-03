import { useMemo } from 'react';
import { buildSlotLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/native';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
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
 * times on the chosen day. A thin wrapper over the shared calendar, whose MUI
 * twin mWeb and the portals render, so all three surfaces stay identical
 * (rule 27).
 */
export function SlotPicker({
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

  // The step above already narrows to one space, so every tile on a day belongs
  // to the same space and needs no caption.
  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.id,
        start_at: slot.start_at,
        end_at: slot.end_at,
        price: slot.price,
      })),
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
