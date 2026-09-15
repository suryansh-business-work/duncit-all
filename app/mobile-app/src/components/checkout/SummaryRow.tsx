import { Text, XStack } from 'tamagui';

export type SummaryRowProps = Readonly<{
  label: string;
  value: string;
  bold?: boolean;
  tone?: string;
  testID?: string;
}>;

/** One label · value line of the order summary; `bold` is the total, `tone` a
 * coloured deduction. */
export function SummaryRow({ label, value, bold, tone, testID }: SummaryRowProps) {
  const labelColor = tone ?? (bold ? '$color' : '$muted');
  return (
    <XStack testID={testID} justifyContent="space-between" alignItems="center">
      <Text fontSize={bold ? 15 : 13} fontWeight={bold ? '700' : '500'} color={labelColor}>
        {label}
      </Text>
      <Text fontSize={bold ? 16 : 13} fontWeight={bold ? '700' : '600'} color={tone ?? '$color'}>
        {value}
      </Text>
    </XStack>
  );
}
