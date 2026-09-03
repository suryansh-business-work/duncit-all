import { Text, YStack } from 'tamagui';

/** Stat tile shared by the studio dashboards. */
export function StatTile({ label, value }: Readonly<{ label: string; value: string | number }>) {
  return (
    <YStack
      flex={1}
      padding={12}
      borderRadius={12}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
    >
      <Text fontSize={11} fontWeight="700" color="$primary">
        {label}
      </Text>
      <Text fontSize={17} fontWeight="700" color="$color" numberOfLines={1}>
        {value}
      </Text>
    </YStack>
  );
}
