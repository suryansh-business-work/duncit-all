import { useMemo, useState } from 'react';
import { format, parse } from 'date-fns';
import { Alert, Card, CardContent, Stack, Typography } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  AvailabilityCalendar,
  CalendarLegend,
  holidaysWith,
  periodLabel,
  pricingWithBlocked,
  shiftAnchor,
  slotCoversDay,
  usePricingModule,
  useVenueSlots,
  viewRange,
} from '@duncit/availability-calendar';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import CalendarDayDrawer from './CalendarDayDrawer';

const YMD = 'yyyy-MM-dd';

interface Props {
  venueId: string;
  holidays: string[];
  /** Re-reads the venue (its holidays live in its settings). */
  onVenueChanged: () => Promise<unknown>;
}

/**
 * The venue's month at a glance: its bookings (and any slot rows it still
 * has), blocked dates and holidays — no prices. A date opens a drawer that
 * blocks it or marks it a holiday; what is already booked that day is kept.
 */
export default function VenueCalendar({ venueId, holidays, onVenueChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState(() => new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const range = useMemo(() => viewRange('month', anchor), [anchor]);
  const slots = useVenueSlots(venueId, range);
  const pricingModule = usePricingModule(venueId);
  const blockedDates = pricingModule.pricing?.blocked_dates ?? [];
  const selectedDate = selected ? parse(selected, YMD, new Date()) : null;
  const hasBookings =
    !!selectedDate && slots.slots.some((slot) => slot.status === 'BOOKED' && slotCoversDay(slot, selectedDate));

  const setBlocked = async (next: boolean) => {
    if (!selected || !pricingModule.pricing) return;
    await pricingModule.save(pricingWithBlocked(pricingModule.pricing, selected, next));
  };
  const setHoliday = async (next: boolean) => {
    if (!selected) return;
    await pricingModule.saveHolidays(holidaysWith(holidays, selected, next));
    await onVenueChanged();
  };

  return (
    <Card variant="outlined" data-testid="venue-calendar">
      <CardContent>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between', mb: 2 }}
        >
          <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 900 }}>
            {t('partners.venueSetup.calendarTitle')}
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <DuncitIconButton onClick={() => setAnchor(shiftAnchor('month', anchor, -1))} aria-label={t('availability.toolbar.previous')}>
              <ChevronLeftIcon />
            </DuncitIconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, minWidth: 140, textAlign: 'center' }}>
              {periodLabel('month', anchor, range)}
            </Typography>
            <DuncitIconButton onClick={() => setAnchor(shiftAnchor('month', anchor, 1))} aria-label={t('availability.toolbar.next')}>
              <ChevronRightIcon />
            </DuncitIconButton>
            <DuncitButton size="small" onClick={() => setAnchor(new Date())}>
              {t('availability.toolbar.today')}
            </DuncitButton>
          </Stack>
        </Stack>
        {slots.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {slots.error.message}
          </Alert>
        )}
        <AvailabilityCalendar
          month={anchor}
          slots={slots.slots}
          selectedDate={selectedDate}
          onSelect={(date) => setSelected(format(date, YMD))}
          holidays={holidays}
          renderDayFooter={(key) =>
            blockedDates.includes(key) ? (
              <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 800 }}>
                {t('partners.venueSetup.blocked')}
              </Typography>
            ) : null
          }
        />
        <CalendarLegend />
        <Typography variant="caption" component="p" sx={{ color: 'text.secondary', mt: 1 }}>
          {t('partners.venueSetup.calendarHint')}
        </Typography>
      </CardContent>
      <CalendarDayDrawer
        ymd={selected}
        blocked={!!selected && blockedDates.includes(selected)}
        holiday={!!selected && holidays.includes(selected)}
        hasBookings={hasBookings}
        onClose={() => setSelected(null)}
        onBlocked={setBlocked}
        onHoliday={setHoliday}
      />
    </Card>
  );
}
