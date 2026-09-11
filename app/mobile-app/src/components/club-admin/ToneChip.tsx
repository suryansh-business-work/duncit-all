import { Text, XStack } from 'tamagui';

interface Props {
  label: string;
  /** Resolved colour — see `useToneColors`. */
  color: string;
  testID?: string;
}

/** The outlined status pill every Club Admin row draws — one shape for a pod
 * status, an audit action and an AI risk, so the three cannot drift. */
export function ToneChip({ label, color, testID }: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      paddingHorizontal={10}
      paddingVertical={4}
      borderRadius={999}
      borderWidth={1}
      borderColor={color}
    >
      <Text fontSize={11} fontWeight="600" color={color}>
        {label}
      </Text>
    </XStack>
  );
}
