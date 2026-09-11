import { Text, YStack } from 'tamagui';

interface Props {
  label: string;
  value: string;
  testID: string;
}

/** One labelled figure on a Club Admin row (followers, pods, revenue…): a
 * muted label over the value. */
export function MetricCell({ label, value, testID }: Readonly<Props>) {
  return (
    <YStack testID={testID} flexBasis="30%" flexGrow={1} gap={2}>
      <Text fontSize={12} fontWeight="500" color="$muted" numberOfLines={1}>
        {label}
      </Text>
      <Text fontSize={14} fontWeight="600" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}
