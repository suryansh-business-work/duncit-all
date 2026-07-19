import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

interface Props {
  title: string;
  subtitle: string;
  empty: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** Surface card for one insights chart — renders the chart or a consistent
 * "No data available" empty state. Mirrors mWeb's InsightChartCard. */
export function InsightCard({ title, subtitle, empty, action, children }: Readonly<Props>) {
  return (
    <YStack
      gap={10}
      padding={14}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <XStack alignItems="flex-start" gap={8}>
        <YStack flex={1}>
          <Text fontSize={15} fontWeight="900" color="$color">
            {title}
          </Text>
          <Text fontSize={11.5} color="$muted">
            {subtitle}
          </Text>
        </YStack>
        {action}
      </XStack>
      {empty ? (
        <YStack alignItems="center" justifyContent="center" paddingVertical={28}>
          <Text fontSize={13} fontWeight="700" color="$muted">
            No data available
          </Text>
        </YStack>
      ) : (
        children
      )}
    </YStack>
  );
}
