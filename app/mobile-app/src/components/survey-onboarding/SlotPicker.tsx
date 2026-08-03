import { useMemo } from 'react';
import { mwebCurrentLabel, mwebMeetingLabels } from '@duncit/slots';
import { SlotCalendar } from '@/components/slots';

import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { MeetingSlot } from '@/graphql/onboarding-survey';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
  /** The slot the user is already booked into — shown highlighted but not re-pickable (reschedule). */
  currentSlot?: string;
}

/**
 * Pick a meeting date, then a time on that date — the Tamagui twin of mWeb's
 * survey-gate picker, on the same shared calendar every pod flow renders. Booked
 * slots stay visible but disabled; on reschedule the current slot is marked and
 * locked so the user must choose a different one.
 */
export function SlotPicker({ slots, value, onChange, currentSlot }: Readonly<Props>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();

  const labels = useMemo(() => mwebMeetingLabels(t, !!currentSlot), [t, currentSlot]);

  // A meeting slot has no id of its own — `start_at` is its identity.
  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => {
        const isCurrent = !!currentSlot && slot.start_at === currentSlot;
        return {
          id: slot.start_at,
          start_at: slot.start_at,
          end_at: slot.end_at,
          caption: isCurrent ? mwebCurrentLabel(t) : undefined,
          disabled: !slot.available || isCurrent,
        };
      }),
    [slots, currentSlot, t],
  );

  return (
    <SlotCalendar
      slots={calendarSlots}
      selectedSlotId={value}
      onPick={(slot) => onChange(slot.id)}
      fmt={fmt}
      labels={labels}
      showPrice={false}
      required
    />
  );
}
