import { useCallback, useMemo, useState } from 'react';
import { addMonths, endOfMonth, startOfMonth } from 'date-fns';
import { dateOverrideOn } from '@duncit/utils';

import { PricingCalendarCard } from '@/components/venue-pricing/PricingCalendarCard';
import { PricingDaySheet } from '@/components/venue-pricing/PricingDaySheet';
import { dayRateOf, isBookedDay, isSlotModel } from '@/components/venue-pricing/pricing-calendar';
import { dayKeyOf } from '@/components/venue-availability/availability-grid';
import {
  PriceRuleMode,
  VenuePricingModel,
  type VenuePricingInput,
} from '@/generated/graphql/graphql';
import type { SavedPricing } from '@/forms/venue-pricing';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueBookingCalendar } from '@/hooks/useVenueBookingCalendar';
import { appNow } from '@/utils/app-formatter';
import { usePricingDayActions } from './usePricingDayActions';

interface Props {
  venueId: string;
  pricing: SavedPricing;
  holidays: readonly string[];
  savePricing: (input: VenuePricingInput) => Promise<void>;
  /** Re-reads the venue after a holiday changes. */
  onVenueChanged: () => void;
}

/**
 * The calendar half of the Venue Pricing Module: the month with each day's
 * price under the saved model, and the sheet that changes one date. Booked
 * dates come from the server's booking calendar and open read-only.
 */
export function PricingCalendarSection({
  venueId,
  pricing,
  holidays,
  savePricing,
  onVenueChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const now = appNow();
  const todayKey = dayKeyOf(now);
  const [anchor, setAnchor] = useState(() => startOfMonth(now));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const from = dayKeyOf(startOfMonth(anchor));
  const to = dayKeyOf(endOfMonth(anchor));
  const calendar = useVenueBookingCalendar(venueId, from, to);

  const blocked = useMemo(() => new Set(pricing.blocked_dates), [pricing.blocked_dates]);
  const holidaySet = useMemo(() => new Set(holidays), [holidays]);
  const modelLabels: Record<VenuePricingModel, string> = {
    [VenuePricingModel.PerPax]: t('availability.pricingModule.modelPerPax'),
    [VenuePricingModel.PerSlot]: t('availability.pricingModule.modelPerSlot'),
    [VenuePricingModel.PerHour]: t('availability.pricingModule.modelPerHour'),
    [VenuePricingModel.Flat]: t('availability.pricingModule.modelFlat'),
  };
  const refetchCalendar = calendar.refetch;
  const onChanged = useCallback(() => {
    onVenueChanged();
    refetchCalendar().catch(() => undefined);
  }, [onVenueChanged, refetchCalendar]);
  const actions = usePricingDayActions({
    venueId,
    dayKey: selectedDay,
    pricing,
    holidays,
    savePricing,
    onChanged,
  });

  const day = selectedDay ? calendar.days.get(selectedDay) : undefined;
  const override = selectedDay ? dateOverrideOn(pricing.price_rules, selectedDay) : undefined;

  return (
    <>
      <PricingCalendarCard
        anchor={anchor}
        onShift={(direction) => setAnchor((value) => addMonths(value, direction))}
        canGoPrev={from > dayKeyOf(startOfMonth(now))}
        modelLabel={pricing.model ? modelLabels[pricing.model] : null}
        pricing={pricing}
        days={calendar.days}
        blocked={blocked}
        holidays={holidaySet}
        todayKey={todayKey}
        selectedDay={selectedDay}
        onPickDay={setSelectedDay}
        isLoading={calendar.isLoading}
        error={calendar.error}
      />
      <PricingDaySheet
        dayKey={selectedDay}
        day={day}
        booked={isBookedDay(day)}
        blocked={!!selectedDay && blocked.has(selectedDay)}
        holiday={!!selectedDay && holidaySet.has(selectedDay)}
        rate={selectedDay ? dayRateOf(pricing, selectedDay) : null}
        slotModel={isSlotModel(pricing)}
        override={
          override
            ? {
                mode: override.mode === PriceRuleMode.Flat ? 'FLAT' : 'PERCENT',
                value: String(override.value),
              }
            : null
        }
        actions={actions}
        onClose={() => setSelectedDay(null)}
      />
    </>
  );
}
