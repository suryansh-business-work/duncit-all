import { useMemo } from 'react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { shellMeetingLabels } from '@duncit/slots';
import { SlotCalendar } from '@duncit/slots/mui';
import type { MeetingSlot } from './queries';

interface Props {
  slots: MeetingSlot[];
  value: string;
  onChange: (startAt: string) => void;
}

/**
 * Pick a meeting date, then a time on that date — the staff-side twin of the
 * applicant gate picker, and the same calendar every pod flow renders. Already
 * booked slots stay visible but disabled.
 *
 * Reopening a scheduled meeting lands on its saved day: `resolveSlotDay` inside
 * the calendar resolves the active day from the current selection before falling
 * back to the first available day.
 */
export default function ScheduleSlotPicker({ slots, value, onChange }: Readonly<Props>) {
  const fmt = useDateFormat();
  const { t } = useTranslation();

  const labels = useMemo(
    () => shellMeetingLabels(t, false),
    [t],
  );

  // A meeting slot has no id of its own — `start_at` is its identity.
  const calendarSlots = useMemo(
    () =>
      slots.map((slot) => ({
        id: slot.start_at,
        start_at: slot.start_at,
        end_at: slot.end_at,
        disabled: !slot.available,
      })),
    [slots],
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
