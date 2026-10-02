import { Text, XStack } from 'tamagui';

export function Row({
  label,
  value,
  bold,
}: Readonly<{ label: string; value: string; bold?: boolean }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={12}>
      <Text
        flex={1}
        fontSize={bold ? 15 : 13}
        fontWeight={bold ? '700' : '600'}
        color={bold ? '$color' : '$muted'}
      >
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '700' : '600'} color="$color">
        {value}
      </Text>
    </XStack>
  );
}
