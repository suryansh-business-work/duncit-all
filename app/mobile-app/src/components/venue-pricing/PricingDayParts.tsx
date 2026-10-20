import { Text, XStack } from 'tamagui';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DateOverrideForm, type RuleModeName } from '@/forms/venue-pricing';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';

import type { DayActions } from './PricingDaySheet';

interface NotesProps {
  day: BookingDay | undefined;
  booked: boolean;
  blocked: boolean;
  holiday: boolean;
  rate: number | null;
}

/** What the date is: its rate, whether it is blocked, a holiday or booked, and the booked windows. */
export function DayNotes({ day, booked, blocked, holiday, rate }: Readonly<NotesProps>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  return (
    <>
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
    </>
  );
}

interface EditProps {
  dayKey: string;
  blocked: boolean;
  holiday: boolean;
  busy: boolean;
  override: { mode: RuleModeName; value: string } | null;
  actions: DayActions;
  run: (action: () => Promise<void>) => void;
}

/** The date's own price, then block / holiday — shown only while it has no bookings. */
export function DayEditActions({
  dayKey,
  blocked,
  holiday,
  busy,
  override,
  actions,
  run,
}: Readonly<EditProps>) {
  const { t } = useTranslation();
  const blockLabel = blocked
    ? t('availability.pricingModule.day.unblock')
    : t('availability.pricingModule.day.block');
  const holidayLabel = holiday
    ? t('availability.pricingModule.day.unholiday')
    : t('availability.pricingModule.day.holiday');
  return (
    <>
      <DateOverrideForm
        key={`${dayKey}-${override?.mode ?? ''}-${override?.value ?? ''}`}
        current={override}
        busy={busy}
        onSave={(mode, value) => run(() => actions.setOverride(mode, value))}
        onClear={() => run(actions.clearOverride)}
      />
      <XStack gap={8} flexWrap="wrap">
        <DuncitButton
          testID="pricing-day-block"
          label={blockLabel}
          onPress={() => run(actions.toggleBlock)}
          disabled={busy}
          variant="outline"
          tone={blocked ? 'neutral' : 'danger'}
          size="sm"
        />
        <DuncitButton
          testID="pricing-day-holiday-toggle"
          label={holidayLabel}
          onPress={() => run(actions.toggleHoliday)}
          disabled={busy}
          variant="outline"
          tone="neutral"
          size="sm"
        />
      </XStack>
    </>
  );
}
