import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { DateOverrideForm, type RuleModeName } from '@/forms/venue-pricing';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';
import { toErrorMessage } from '@/utils/errors';
import { DaySlotsList } from './DaySlotsList';

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
          {rate === null ? null : (
            <Text testID="pricing-day-rate" fontSize={14} color="$color">
              {t('availability.pricingModule.day.rate', { vars: { rate: formatMoney(rate) } })}
            </Text>
          )}
          {blocked ? (
            <Text testID="pricing-day-blocked" fontSize={13} color="$danger">
              {t('availability.pricingModule.day.blockedNote')}
            </Text>
          ) : null}
          {holiday ? (
            <Text testID="pricing-day-holiday" fontSize={13} color="$danger">
              {t('availability.pricingModule.day.holidayNote')}
            </Text>
          ) : null}
          {booked ? (
            <Text testID="pricing-day-booked" fontSize={13} color="$muted">
              {t('availability.pricingModule.day.booked')}
            </Text>
          ) : null}
          {booked
            ? day?.busy.map((busyWindow) => (
                <Text key={busyWindow.start} fontSize={13} color="$color">
                  {t('availability.pricingModule.day.bookedWindow', {
                    vars: {
                      window: `${fmt.formatTime(busyWindow.start)} – ${fmt.formatTime(busyWindow.end)}`,
                    },
                  })}
                </Text>
              ))
            : null}
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
            <>
              <DateOverrideForm
                key={`${dayKey}-${props.override?.mode ?? ''}-${props.override?.value ?? ''}`}
                current={props.override}
                busy={busy}
                onSave={(mode, value) => run(() => actions.setOverride(mode, value))}
                onClear={() => run(actions.clearOverride)}
              />
              <XStack gap={8} flexWrap="wrap">
                <DuncitButton
                  testID="pricing-day-block"
                  label={
                    blocked
                      ? t('availability.pricingModule.day.unblock')
                      : t('availability.pricingModule.day.block')
                  }
                  onPress={() => run(actions.toggleBlock)}
                  disabled={busy}
                  variant="outline"
                  tone={blocked ? 'neutral' : 'danger'}
                  size="sm"
                />
                <DuncitButton
                  testID="pricing-day-holiday-toggle"
                  label={
                    holiday
                      ? t('availability.pricingModule.day.unholiday')
                      : t('availability.pricingModule.day.holiday')
                  }
                  onPress={() => run(actions.toggleHoliday)}
                  disabled={busy}
                  variant="outline"
                  tone="neutral"
                  size="sm"
                />
              </XStack>
            </>
          )}
        </YStack>
      ) : null}
    </DuncitDialog>
  );
}
