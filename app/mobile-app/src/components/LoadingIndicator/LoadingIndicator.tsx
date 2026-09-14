import { Spinner, Text, YStack } from 'tamagui';

import { useLoadingRegion } from '@/components/Skeleton/useLoadingRegion';

export interface LoadingIndicatorProps {
  label?: string;
  testID?: string;
}

/** Centered spinner with an optional label — announced as one busy progressbar
 * named by the label, or "Loading…" when there is none. */
export function LoadingIndicator({ label, testID }: Readonly<LoadingIndicatorProps>) {
  const region = useLoadingRegion(label);
  return (
    <YStack alignItems="center" gap={8} testID={testID} {...region}>
      <Spinner color="$primary" />
      {label ? (
        <Text fontSize={14} color="$muted">
          {label}
        </Text>
      ) : null}
    </YStack>
  );
}
