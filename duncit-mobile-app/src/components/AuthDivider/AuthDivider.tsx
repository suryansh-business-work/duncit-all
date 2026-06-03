import { Separator, Text, XStack } from 'tamagui';

/** "OR" separator matching mWeb's <Divider>OR</Divider>. */
export function AuthDivider({ label = 'OR' }: { label?: string }) {
  return (
    <XStack alignItems="center" gap={12} testID="auth-divider">
      <Separator flex={1} borderColor="$borderColor" />
      <Text fontSize={12} fontWeight="600" color="$muted">
        {label}
      </Text>
      <Separator flex={1} borderColor="$borderColor" />
    </XStack>
  );
}
