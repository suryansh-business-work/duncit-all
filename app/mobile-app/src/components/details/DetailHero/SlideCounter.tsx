import { Text, XStack } from 'tamagui';

/** "2/5" — a surface pill over the media's bottom-right corner. */
export function SlideCounter({ index, total }: Readonly<{ index: number; total: number }>) {
  return (
    <XStack
      position="absolute"
      right={12}
      bottom={12}
      paddingHorizontal={10}
      paddingVertical={4}
      borderRadius={999}
      backgroundColor="$surface"
    >
      <Text fontSize={12} fontWeight="600" color="$color">
        {index + 1}/{total}
      </Text>
    </XStack>
  );
}
