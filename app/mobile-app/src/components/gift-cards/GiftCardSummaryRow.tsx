import { Text, XStack } from 'tamagui';

interface Props {
  label: string;
  value: string;
  /** The total row: 700 and ink on both sides. */
  bold?: boolean;
}

/** One row of the gift-card checkout summary: label muted, value ink. mWeb
 * twin: gift-card-checkout-page's SummaryRow. */
export function GiftCardSummaryRow({ label, value, bold = false }: Readonly<Props>) {
  const size = bold ? 16 : 14;
  return (
    <XStack justifyContent="space-between" gap={10}>
      <Text fontSize={size} fontWeight={bold ? '700' : '500'} color={bold ? '$color' : '$muted'}>
        {label}
      </Text>
      <Text
        flex={1}
        fontSize={size}
        fontWeight={bold ? '700' : '600'}
        color="$color"
        textAlign="right"
        numberOfLines={1}
      >
        {value}
      </Text>
    </XStack>
  );
}
