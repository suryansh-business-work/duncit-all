import { useMemo, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, Chip, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { slotCoversDay } from '@duncit/slots';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';
import { LoadingOverlay } from '@duncit/ui';
import AvailabilityCalendar from '../../AvailabilityCalendar';
import { buildCells } from '../../AvailabilityCalendar/helpers';
import CalendarLegend from '../../CalendarLegend';
import { viewRange } from '../../calendar-period';
import MonthNavigator from '../../MonthNavigator';
import { useVenueSlots } from '../../useVenueSlots';
import { modelLabel } from '../format';
import { VENUE_BOOKING_CALENDAR } from '../queries';
import type { BookingCalendarData, VenuePricingData, VenuePricingInput } from '../types';
import { dayPrice } from './day-price';
import DayPriceFooter from './DayPriceFooter';
import PricingDayDrawer from './PricingDayDrawer';

interface Props {
  venueId: string;
  pricing: VenuePricingData;
  holidays: string[];
  savePricing: (input: VenuePricingInput) => Promise<void>;
  saveHolidays: (holidays: string[]) => Promise<void>;
}

/**
 * The month calendar, now priced: each day shows its rate and adjustment
 * (or why it is closed), and the venue's existing slots — booked, blocked —
 * keep their badges. Clicking a date opens that date's editor.
 */
export default function PricingCalendar({ venueId, pricing, holidays, savePricing, saveHolidays }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const range = useMemo(() => viewRange('month', anchor), [anchor]);
  const cells = useMemo(() => buildCells('month', anchor, anchor), [anchor]);
  const from = toIsoDay(cells[0]);
  const to = toIsoDay(cells[cells.length - 1]);

  const slots = useVenueSlots(venueId, range);
  const calendar = useQuery<{ venueBookingCalendar: BookingCalendarData }>(VENUE_BOOKING_CALENDAR, {
    variables: { venue_id: venueId, from, to },
    fetchPolicy: 'cache-and-network',
  });
  const days = useMemo(
    () => new Map((calendar.data?.venueBookingCalendar.days ?? []).map((d) => [d.date, d])),
    [calendar.data],
  );

  /** Every date edit ends with a re-read, so the day's closed state and price follow at once. */
  function refreshAfter<A>(write: (arg: A) => Promise<void>) {
    return async (arg: A) => {
      await write(arg);
      await calendar.refetch();
    };
  }
  const selectedDate = selected ? parseIsoDay(selected) : null;
  const daySlots = selectedDate ? slots.slots.filter((s) => slotCoversDay(s, selectedDate)) : [];

  return (
    <Card variant="outlined" data-testid="pricing-calendar">
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 900 }}>
              {t('venuePricing.calendar.title')}
            </Typography>
            <Chip
              size="small"
              color={pricing.model ? 'primary' : 'warning'}
              label={pricing.model ? modelLabel(t, pricing.model) : t('venuePricing.calendar.notSetUp')}
              sx={{ alignSelf: 'flex-start' }}
              data-testid="pricing-calendar-model"
            />
          </Stack>
          <MonthNavigator anchor={anchor} range={range} onChange={setAnchor} />
        </Stack>
        {(calendar.error || slots.error) && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(calendar.error ?? slots.error)?.message}
          </Alert>
        )}
        <LoadingOverlay open={(calendar.loading && !!calendar.data) || slots.refreshing} size={24}>
          <AvailabilityCalendar
            month={anchor}
            slots={slots.slots}
            selectedDate={selectedDate}
            onSelect={(date) => setSelected(toIsoDay(date))}
            holidays={holidays}
            renderDayFooter={(key) => <DayPriceFooter price={dayPrice(t, pricing, days.get(key), key)} />}
          />
        </LoadingOverlay>
        <CalendarLegend />
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1 }}>
          {t('venuePricing.calendar.hint')}
        </Typography>
      </CardContent>
      <PricingDayDrawer
        venueId={venueId}
        ymd={selected}
        day={selected ? days.get(selected) : undefined}
        pricing={pricing}
        holidays={holidays}
        slots={daySlots}
        onClose={() => setSelected(null)}
        savePricing={refreshAfter(savePricing)}
        saveHolidays={refreshAfter(saveHolidays)}
        onToggleSlotBlock={slots.toggleBlock}
        onDeleteSlot={slots.remove}
      />
    </Card>
  );
}
