import { Text, XStack } from 'tamagui';

interface Props {
  label: string;
  /** Resolved colour — see `useToneColors`. */
  color: string;
  testID?: string;
}

/** The outlined status chip every Club Admin row draws — one shape for a pod
 * status, an audit action and an AI risk, so the three cannot drift. */
export function ToneChip({ label, color, testID }: Readonly<Props>) {
  return (
    <XStack
      testID={testID}
      paddingHorizontal={8}
      paddingVertical={3}
      borderRadius={999}
      borderWidth={1}
      borderColor={color}
    >
      <Text fontSize={10.5} fontWeight="700" color={color}>
        {label}
      </Text>
    </XStack>
  );
}
