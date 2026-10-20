import { useMemo } from 'react';
import { Alert, LinearProgress, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { dateToTimeOfDay } from '@duncit/datetime';
import { errorText } from '../format';
import PriceBreakdownView from '../preview/PriceBreakdownView';
import { usePriceQuote } from '../preview/usePriceQuote';
import type { BookingDay, SampleBooking, VenuePricingData } from '../types';

interface Props {
  venueId: string;
  ymd: string;
  day: BookingDay | undefined;
  pricing: VenuePricingData;
}

/** The smallest booking a host could make that day: the first slot, or the minimum hours from opening. */
function sampleFor(ymd: string, day: BookingDay, pricing: VenuePricingData): SampleBooking | null {
  const pax = Math.max(1, pricing.min_pax);
  const slot = day.slots[0];
  if (slot) return { date: ymd, start: dateToTimeOfDay(new Date(slot.start), ''), end: dateToTimeOfDay(new Date(slot.end), ''), pax, pets: false };
  if (!day.open) return null;
  const open = new Date(day.open);
  const end = new Date(open.getTime() + Math.max(1, pricing.min_hours) * 3_600_000);
  return { date: ymd, start: dateToTimeOfDay(open, ''), end: dateToTimeOfDay(end, ''), pax, pets: false };
}

/** One server quote for the selected date — asked once per opened day, never per calendar cell. */
export default function DayQuote({ venueId, ymd, day, pricing }: Readonly<Props>) {
  const { t } = useTranslation();
  const sample = useMemo(() => (day && !day.closed_reason ? sampleFor(ymd, day, pricing) : null), [day, ymd, pricing]);
  const quote = usePriceQuote({
    venueId,
    sample: sample ?? { date: ymd, start: '', end: '', pax: 0, pets: false },
    draft: null,
    enabled: !!sample && pricing.configured,
  });
  if (!sample || !pricing.configured) return null;

  return (
    <Stack spacing={1} data-testid="pricing-day-quote">
      <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 900 }}>
        {t('venuePricing.day.sampleTitle', { vars: { pax: sample.pax } })}
      </Typography>
      {quote.loading && <LinearProgress aria-label={t('venuePricing.preview.pricing')} />}
      {quote.error && <Alert severity="warning">{errorText(quote.error, t('venuePricing.preview.failed'))}</Alert>}
      {!quote.error && quote.breakdown && <PriceBreakdownView breakdown={quote.breakdown} />}
    </Stack>
  );
}
