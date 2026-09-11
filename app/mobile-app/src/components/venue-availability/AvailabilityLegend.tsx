import { Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';
import { SLOT_STATUS_TONE } from './slot-labels';

interface LegendItemProps {
  tone: string;
  label: string;
}

/** One legend entry: a soft pill with the status dot and its name. */
function LegendItem({ tone, label }: Readonly<LegendItemProps>) {
  return (
    <XStack
      alignItems="center"
      gap={6}
      paddingHorizontal={10}
      paddingVertical={5}
      borderRadius={999}
      backgroundColor="$soft"
    >
      <YStack width={8} height={8} borderRadius={4} backgroundColor={tone} />
      <Text fontSize={12} fontWeight="500" color="$color">
        {label}
      </Text>
    </XStack>
  );
}

/** What the A / P / B / × badges on a day cell mean, in the grid's colours. */
export function AvailabilityLegend() {
  const { t } = useTranslation();
  const items: (LegendItemProps & { id: string })[] = [
    {
      id: 'available',
      tone: SLOT_STATUS_TONE.AVAILABLE,
      label: t('availability.legend.available'),
    },
    { id: 'pending', tone: SLOT_STATUS_TONE.PENDING, label: t('availability.legend.pending') },
    { id: 'booked', tone: SLOT_STATUS_TONE.BOOKED, label: t('availability.legend.booked') },
    { id: 'blocked', tone: SLOT_STATUS_TONE.BLOCKED, label: t('availability.legend.blocked') },
    { id: 'leave', tone: '$danger', label: t('availability.legend.leave') },
  ];
  return (
    <XStack flexWrap="wrap" gap={6} testID="availability-legend">
      {items.map((item) => (
        <LegendItem key={item.id} tone={item.tone} label={item.label} />
      ))}
    </XStack>
  );
}
