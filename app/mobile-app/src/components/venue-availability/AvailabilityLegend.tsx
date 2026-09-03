import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

interface LegendItemProps {
  tone: string;
  label: string;
}

function LegendItem({ tone, label }: Readonly<LegendItemProps>) {
  return (
    <XStack alignItems="center" gap={6}>
      <YStack width={12} height={12} borderRadius={3} backgroundColor={tone} />
      <Text fontSize={11.5} color="$muted">
        {label}
      </Text>
    </XStack>
  );
}

/** What the A / P / B / × badges on a day cell mean, in the grid's colours. */
export function AvailabilityLegend() {
  const { t } = useTranslation();
  const items: (LegendItemProps & { id: string })[] = [
    { id: 'available', tone: '$success', label: t('availability.legend.available') },
    { id: 'pending', tone: '$primary', label: t('availability.legend.pending') },
    { id: 'booked', tone: '$warning', label: t('availability.legend.booked') },
    { id: 'blocked', tone: '$muted', label: t('availability.legend.blocked') },
    { id: 'leave', tone: '$danger', label: t('availability.legend.leave') },
  ];
  return (
    <XStack flexWrap="wrap" gap={12} testID="availability-legend">
      {items.map((item) => (
        <LegendItem key={item.id} tone={item.tone} label={item.label} />
      ))}
    </XStack>
  );
}
