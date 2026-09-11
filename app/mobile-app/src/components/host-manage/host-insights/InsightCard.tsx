import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  title: string;
  /** Accepted for existing callers, no longer drawn: the title says it. */
  subtitle?: string;
  empty: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** Surface card for one insights chart — renders the chart or a consistent
 * "No data available" empty state. Mirrors mWeb's InsightChartCard. */
export function InsightCard({ title, empty, action, children }: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <SurfaceCard gap={8}>
      <XStack alignItems="center" gap={8} minHeight={36}>
        <Text flex={1} fontSize={16} fontWeight="600" color="$color">
          {title}
        </Text>
        {action}
      </XStack>
      {empty ? (
        <YStack alignItems="center" justifyContent="center" gap={8} paddingVertical={32}>
          <MaterialIcons name="insights" size={32} color={muted} />
          <Text fontSize={14} fontWeight="500" color="$muted">
            No data available
          </Text>
        </YStack>
      ) : (
        children
      )}
    </SurfaceCard>
  );
}
