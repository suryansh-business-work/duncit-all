import { Text, YStack } from 'tamagui';
import type { AutoPodLabels } from '@duncit/utils';

import type { AutoPodHostProjection } from '@/hooks/useAutoPodHostProjection';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  projection: AutoPodHostProjection | null;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
}

/**
 * The earning breakdown for the numbers typed — what the host keeps, then what
 * the venue, the club admin and the platform take — or why the numbers do not
 * work. The Tamagui twin of the MUI dialog's `ProjectionLines` (rule 27).
 */
export function HostProjectionLines({ projection, labels, formatMoney }: Readonly<Props>) {
  const { success, warning } = useThemeColors();
  if (!projection) return null;
  if (!projection.viable) {
    return (
      <Text testID="auto-pod-projection-not-viable" fontSize={12.5} color={warning}>
        {labels.projectionNotViable}
      </Text>
    );
  }
  const fees = projection.gst_amount + projection.platform_fee_amount;
  return (
    <YStack gap={2} testID="auto-pod-host-projection">
      <Text fontSize={12} fontWeight="700" color="$muted">
        {labels.projectionTitle}
      </Text>
      <Text fontSize={13} fontWeight="700" color={success}>
        {labels.projectionHost(formatMoney(projection.host_receives))}
      </Text>
      <Text fontSize={12} color="$muted">
        {`${labels.projectionVenue(formatMoney(projection.venue_amount))} · ${labels.projectionClub(formatMoney(projection.club_admin_amount))} · ${labels.projectionFees(formatMoney(fees))}`}
      </Text>
    </YStack>
  );
}
