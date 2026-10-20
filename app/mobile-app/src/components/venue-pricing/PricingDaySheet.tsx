import { useState } from 'react';
import { Text, YStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import type { RuleModeName } from '@/forms/venue-pricing';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';
import { toErrorMessage } from '@/utils/errors';
import { DaySlotsList } from './DaySlotsList';
import { DayEditActions, DayNotes } from './PricingDayParts';

export interface DayActions {
  setOverride: (mode: RuleModeName, value: number) => Promise<void>;
  clearOverride: () => Promise<void>;
  toggleBlock: () => Promise<void>;
  toggleHoliday: () => Promise<void>;
}

interface Props {
  /** The open date, or null while the sheet is closed. */
  dayKey: string | null;
  day: BookingDay | undefined;
  booked: boolean;
  blocked: boolean;
  holiday: boolean;
  /** The day's rate after its rules (non-slot models), for the summary line. */
  rate: number | null;
  slotModel: boolean;
  /** The date's own price, when it has one. */
  override: { mode: RuleModeName; value: string } | null;
  actions: DayActions;
  onClose: () => void;
}

/**
 * One date of the Venue Pricing Module: its own price (DATE_OVERRIDE), block
 * or unblock it, mark it a holiday and, for a slot venue, its slots. A date
 * with bookings is read-only — its windows are listed, nothing else.
 */
export function PricingDaySheet(props: Readonly<Props>) {
  const { dayKey, day, booked, blocked, holiday, rate, actions } = props;
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const run = (action: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    action()
      .then(() => setMessage({ ok: true, text: t('availability.pricingModule.day.updated') }))
      .catch((e: unknown) =>
        setMessage({
          ok: false,
          text: toErrorMessage(e, t('availability.pricingModule.day.updateFailed')),
        }),
      )
      .finally(() => setBusy(false));
  };
  const close = () => {
    setMessage(null);
    props.onClose();
  };

  return (
    <DuncitDialog
      open={!!dayKey}
      onClose={close}
      testID="pricing-day-sheet"
      title={t('availability.pricingModule.calendar.title')}
      subtitle={dayKey ? fmt.formatDay(dayKey) : undefined}
      closeLabel={t('mweb.common.close')}
    >
      {dayKey ? (
        <YStack gap={14}>
          <DayNotes day={day} booked={booked} blocked={blocked} holiday={holiday} rate={rate} />
          {props.slotModel ? <DaySlotsList slots={day?.slots ?? []} /> : null}
          {message ? (
            <Text
              role={message.ok ? 'status' : 'alert'}
              testID="pricing-day-message"
              fontSize={13}
              color={message.ok ? '$success' : '$danger'}
            >
              {message.text}
            </Text>
          ) : null}
          {booked ? null : (
            <DayEditActions
              dayKey={dayKey}
              blocked={blocked}
              holiday={holiday}
              busy={busy}
              override={props.override}
              actions={actions}
              run={run}
            />
          )}
        </YStack>
      ) : null}
    </DuncitDialog>
  );
}
