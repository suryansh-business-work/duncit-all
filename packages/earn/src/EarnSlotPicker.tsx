import { useMemo } from 'react';
import { useDateFormat } from '@duncit/app-settings';
import { SlotCalendar } from '@duncit/slots/mui';
import type { MeetingSlot } from './queries';
import { useEarnSurface } from './EarnSurfaceProvider';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
  /** The user's currently-booked slot (reschedule): shown for reference, not re-selectable. */
  currentSlot?: string | null;
}

/**
 * Pick a meeting date, then a time on that date — the same calendar the pod
 * flows use. A meeting slot has no id of its own, so `start_at` is its identity.
 * Booked slots stay visible but disabled, and on reschedule the current slot is
 * marked and locked so the user must choose a different one. Copy comes from
 * the surface's namespace via EarnSurfaceProvider.
 */
export default function EarnSlotPicker({ slots, value, onChange, currentSlot }: Readonly<Props>) {
  const fmt = useDateFormat();
  const { meetingSlotLabels, currentSlotBadge } = useEarnSurface();

  const labels = useMemo(
    () => meetingSlotLabels(!!currentSlot),
    [meetingSlotLabels, currentSlot],
  );

  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => {
        const isCurrent = !!currentSlot && slot.start_at === currentSlot;
        return {
          id: slot.start_at,
          start_at: slot.start_at,
          end_at: slot.end_at,
          caption: isCurrent ? currentSlotBadge : undefined,
          disabled: !slot.available || isCurrent,
        };
      }),
    [slots, currentSlot, currentSlotBadge],
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
