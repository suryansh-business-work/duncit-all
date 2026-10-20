import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { weekdayInitials } from '@duncit/slots';
import { formatMoney } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { WeekdayHeader } from '@/components/slots/WeekdayHeader';
import { periodLabel, viewCells } from '@/components/venue-availability/availability-grid';
import type { SavedPricing } from '@/forms/venue-pricing';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BookingDay } from '@/hooks/useVenueBookingCalendar';
import { PricingDayCell } from './PricingDayCell';
import { dayRateOf, dayTagOf, isSlotModel, type DayTag } from './pricing-calendar';

interface Props {
  /** Any instant inside the month shown. */
  anchor: Date;
  onShift: (direction: 1 | -1) => void;
  /** False on the current month — past months hold nothing to edit. */
  canGoPrev: boolean;
  modelLabel: string | null;
  pricing: SavedPricing;
  days: ReadonlyMap<string, BookingDay>;
  blocked: ReadonlySet<string>;
  holidays: ReadonlySet<string>;
  todayKey: string;
  selectedDay: string | null;
  onPickDay: (dayKey: string) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * The Venue Pricing Module's month: each day's price under the selected model
 * (a slot venue shows its slot count), and what is blocked, on leave, booked
 * or closed. Built on the availability calendar's own month grid
 * (`viewCells`, `WeekdayHeader`), so both calendars agree on which days exist.
 */
export function PricingCalendarCard(props: Readonly<Props>) {
  const { anchor, onShift, canGoPrev, modelLabel, pricing, days, blocked, holidays } = props;
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const { color: ink } = useThemeColors();
  const tagLabels: Record<Exclude<DayTag, null>, string> = {
    blocked: t('availability.pricingModule.calendar.blocked'),
    holiday: t('availability.pricingModule.calendar.holiday'),
    booked: t('availability.pricingModule.calendar.booked'),
    closed: t('availability.pricingModule.calendar.closed'),
  };
  const detailOf = (dayKey: string): string | null => {
    if (isSlotModel(pricing)) {
      const count = days.get(dayKey)?.slots.length ?? 0;
      return count > 0
        ? t('availability.pricingModule.calendar.slotsCount', { vars: { count } })
        : null;
    }
    const rate = dayRateOf(pricing, dayKey);
    return rate === null ? null : formatMoney(rate);
  };

  return (
    <SurfaceCard testID="pricing-calendar" gap={12} padding={12}>
      <SectionHeader title={t('availability.pricingModule.calendar.title')} />
      {modelLabel ? (
        <Text testID="pricing-calendar-model" fontSize={13} color="$muted">
          {t('availability.pricingModule.calendar.modelLine', { vars: { model: modelLabel } })}
        </Text>
      ) : null}
      <XStack alignItems="center" justifyContent="space-between">
        <DuncitButton
          testID="pricing-calendar-prev"
          label={t('availability.pricingModule.calendar.previous')}
          icon={<MaterialIcons name="chevron-left" size={20} color={ink} />}
          onPress={() => onShift(-1)}
          disabled={!canGoPrev}
          variant="ghost"
          size="sm"
        />
        <Text testID="pricing-calendar-period" fontSize={15} fontWeight="600" color="$color">
          {periodLabel('month', anchor, fmt)}
        </Text>
        <DuncitButton
          testID="pricing-calendar-next"
          label={t('availability.pricingModule.calendar.next')}
          iconAfter={<MaterialIcons name="chevron-right" size={20} color={ink} />}
          onPress={() => onShift(1)}
          variant="ghost"
          size="sm"
        />
      </XStack>
      {props.error ? (
        <Text role="alert" testID="pricing-calendar-error" fontSize={13} color="$danger">
          {props.error}
        </Text>
      ) : null}
      {props.isLoading ? <Spinner testID="pricing-calendar-loading" color="$primary" /> : null}
      <YStack gap={6} role="radiogroup">
        <WeekdayHeader initials={weekdayInitials(fmt)} />
        {viewCells('month', anchor).map((row) => {
          const rowKey = row.find(Boolean) ?? '';
          return (
            <XStack key={rowKey} gap={4}>
              {row.map((dayKey, column) => {
                if (!dayKey) return <YStack key={`${rowKey}-c${column}`} flex={1} />;
                const tag = dayTagOf(dayKey, days.get(dayKey), blocked, holidays);
                return (
                  <PricingDayCell
                    key={dayKey}
                    dayKey={dayKey}
                    label={String(Number(dayKey.slice(8, 10)))}
                    detail={detailOf(dayKey)}
                    tag={tag}
                    tagLabel={tag ? tagLabels[tag] : null}
                    disabled={dayKey < props.todayKey}
                    selected={dayKey === props.selectedDay}
                    isToday={dayKey === props.todayKey}
                    onPress={props.onPickDay}
                  />
                );
              })}
            </XStack>
          );
        })}
      </YStack>
    </SurfaceCard>
  );
}
