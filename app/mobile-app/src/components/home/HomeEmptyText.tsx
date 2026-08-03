import { Text } from 'tamagui';

import { Reveal } from '@/animations/Reveal';

/** The no-pods empty state — extracted from HomeFeed for the 200-line cap. */
export function HomeEmptyText() {
  return (
    <Reveal index={4} scale>
      <Text
        testID="home-empty"
        textAlign="center"
        fontSize={13}
        color="$muted"
        paddingHorizontal={24}
        paddingVertical={32}
      >
        No pods here yet. Pull to refresh or pick a different vibe.
      </Text>
    </Reveal>
  );
}
