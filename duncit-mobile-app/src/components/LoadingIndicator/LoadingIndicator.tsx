import { Spinner, Text, YStack } from 'tamagui';

export interface LoadingIndicatorProps {
  label?: string;
  testID?: string;
}

/** Centered spinner with an optional label. */
export function LoadingIndicator({ label, testID }: LoadingIndicatorProps) {
  return (
    <YStack alignItems="center" gap={8} testID={testID}>
      <Spinner color="$primary" />
      {label ? (
        <Text fontSize={14} color="$muted">
          {label}
        </Text>
      ) : null}
    </YStack>
  );
}
