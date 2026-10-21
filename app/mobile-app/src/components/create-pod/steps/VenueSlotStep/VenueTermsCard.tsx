import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { weekdayLabels } from '@duncit/slots';
import { formatStatementMoney, venuePricingTerms, type VenueTermsSource } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useDateFormat } from '@/hooks/useDateFormat';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  pricing: VenueTermsSource;
  currencySymbol: string;
}

/**
 * The venue's pricing as its owner set it — model, rate, limits, price
 * changes, fees, deposit and open hours — shown before a time is picked, so
 * the host books knowing the terms. Read-only; the exact price is the quote
 * that follows a pick. mWeb twin: VenueTermsCard.
 */
export function VenueTermsCard({ pricing, currencySymbol }: Readonly<Props>) {
  const { t } = useTranslation();
  const fmt = useDateFormat();
  const sections = useMemo(() => {
    const weekdays = weekdayLabels(t).short;
    return venuePricingTerms(pricing, {
      t,
      money: (value) => formatStatementMoney(value, currencySymbol),
      clock: fmt.formatClock,
      date: fmt.formatDay,
      weekday: (day) => weekdays[day] ?? '',
      today: fmt.dayKey(fmt.clock.nowMs()),
    });
  }, [pricing, t, fmt, currencySymbol]);

  return (
    <SurfaceCard gap={12} testID="create-pod-venue-terms">
      <YStack gap={2}>
        <Text role="heading" fontSize={14} fontWeight="700" color="$color">
          {t('mweb.createPod.venueTerms.title')}
        </Text>
        <Text fontSize={12} color="$muted">
          {t('mweb.createPod.venueTerms.hint')}
        </Text>
      </YStack>
      {sections.map((section) => (
        <YStack key={section.id} gap={6} testID={`create-pod-venue-terms-${section.id}`}>
          <Text fontSize={12} fontWeight="700" color="$muted" textTransform="uppercase">
            {section.title}
          </Text>
          {section.rows.map((row) => (
            <XStack key={row.id} justifyContent="space-between" gap={12}>
              <Text flex={1} fontSize={13} color="$muted">
                {row.label}
              </Text>
              <Text flexShrink={1} fontSize={13} fontWeight="500" color="$color" textAlign="right">
                {row.value}
              </Text>
            </XStack>
          ))}
        </YStack>
      ))}
    </SurfaceCard>
  );
}
