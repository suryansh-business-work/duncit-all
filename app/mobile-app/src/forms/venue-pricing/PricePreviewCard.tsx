import { useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { LabeledInput } from '@/components/LabeledInput';
import { SectionHeader } from '@/components/SectionHeader';
import { SurfaceCard } from '@/components/SurfaceCard';
import { BreakdownLines } from '@/components/venue-pricing/BreakdownLines';
import { DateTimePickerField } from '@/components/venue-availability/DateTimePickerField';
import { TimePickerField } from '@/components/venue-availability/TimePickerField';
import { dayFromKey, dayKeyOf } from '@/components/venue-availability/availability-grid';
import { toDigits } from '@duncit/regex';
import { instantOf, useVenuePriceQuote } from '@/hooks/useVenuePriceQuote';
import { useTranslation } from '@/hooks/useTranslation';
import { appNow } from '@/utils/app-formatter';
import { valuesToInput, type SavedPricing } from './venue-pricing.mapping';
import type { makeVenuePricingSchema, VenuePricingValues } from './venue-pricing.types';

interface Props {
  /** The form as it stands (`watch()`), unsaved edits included. */
  values: VenuePricingValues;
  schema: ReturnType<typeof makeVenuePricingSchema>;
  venueId: string;
  saved: SavedPricing;
  /** The sample window the preview opens on — a slot's or the venue's hours. */
  sampleWindow: { start: string; end: string };
}

/**
 * The live preview: a sample booking priced by the server against the form
 * as it stands, unsaved changes included (`venuePriceQuote` with `draft`).
 * Nothing is priced while the form does not validate — the server would only
 * refuse it.
 */
export function PricePreviewCard({
  values,
  schema,
  venueId,
  saved,
  sampleWindow,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [day, setDay] = useState(() => dayKeyOf(addDays(appNow(), 1)));
  const [start, setStart] = useState(sampleWindow.start);
  const [end, setEnd] = useState(sampleWindow.end);
  const [guests, setGuests] = useState(saved.min_pax > 0 ? String(saved.min_pax) : '1');

  const parsed = schema.safeParse(values);
  const draft = parsed.success ? valuesToInput(parsed.data, saved) : null;
  const ready = draft !== null;
  const booking = useMemo(
    () =>
      ready && start && end
        ? { start_at: instantOf(day, start), end_at: instantOf(day, end), pax: Number(guests) || 0 }
        : null,
    [ready, day, start, end, guests],
  );
  const { quote, error, isLoading } = useVenuePriceQuote(
    venueId,
    booking,
    draft,
    t('availability.pricingModule.preview.failed'),
  );

  return (
    <SurfaceCard gap={12} testID="venue-pricing-preview">
      <SectionHeader title={t('availability.pricingModule.preview.title')} />
      <Text fontSize={12} color="$muted">
        {t('availability.pricingModule.preview.hint')}
      </Text>
      <DateTimePickerField
        testID="venue-pricing-preview-date"
        label={t('availability.pricingModule.preview.date')}
        value={dayFromKey(day)}
        onChange={(date) => setDay(dayKeyOf(date))}
      />
      <XStack gap={8}>
        <YStack flex={1}>
          <TimePickerField
            testID="venue-pricing-preview-start"
            label={t('availability.pricingModule.preview.start')}
            value={start}
            onChange={setStart}
          />
        </YStack>
        <YStack flex={1}>
          <TimePickerField
            testID="venue-pricing-preview-end"
            label={t('availability.pricingModule.preview.end')}
            value={end}
            onChange={setEnd}
          />
        </YStack>
      </XStack>
      <LabeledInput
        testID="venue-pricing-preview-guests"
        label={t('availability.pricingModule.preview.guests')}
        value={guests}
        onChangeText={(text) => setGuests(toDigits(text))}
        keyboardType="number-pad"
      />
      {parsed.success ? null : (
        <Text testID="venue-pricing-preview-invalid" fontSize={13} color="$muted">
          {t('availability.pricingModule.preview.invalid')}
        </Text>
      )}
      {isLoading ? (
        <XStack gap={8} alignItems="center">
          <Spinner color="$primary" />
          <Text fontSize={13} color="$muted">
            {t('availability.pricingModule.preview.loading')}
          </Text>
        </XStack>
      ) : null}
      {error ? (
        <Text role="alert" testID="venue-pricing-preview-error" fontSize={13} color="$danger">
          {error}
        </Text>
      ) : null}
      {quote && !error ? (
        <BreakdownLines breakdown={quote} testID="venue-pricing-preview-lines" />
      ) : null}
    </SurfaceCard>
  );
}
