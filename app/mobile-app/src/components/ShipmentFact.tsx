import { Text, XStack } from 'tamagui';

interface ShipmentFactProps {
  label: string;
  value: string;
  /** Lands on the value node, so an assertion reads the value alone. */
  testID: string;
}

/**
 * One "label — value" line of a shipment: a courier, an AWB, an estimate. A
 * blank value renders nothing, so a fact the courier has not reported yet
 * leaves no empty row. Shared by the buyer's order detail and the brand's
 * order desk, which list the same shipment facts.
 */
export function ShipmentFact({ label, value, testID }: Readonly<ShipmentFactProps>) {
  if (!value) return null;
  return (
    <XStack justifyContent="space-between" gap={8}>
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text
        fontSize={13}
        fontWeight="600"
        color="$color"
        testID={testID}
        flexShrink={1}
        textAlign="right"
      >
        {value}
      </Text>
    </XStack>
  );
}
