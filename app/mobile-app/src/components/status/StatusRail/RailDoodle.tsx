import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

/** Decorative dotted-arrow doodle from the mock. */
export function RailDoodle({ accent }: Readonly<{ accent: string }>) {
  return (
    <XStack aria-hidden alignItems="center" gap={5} paddingTop={22} paddingLeft={6} opacity={0.55}>
      <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
      <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
      <YStack width={4} height={4} borderRadius={2} backgroundColor="$accent" />
      <MaterialIcons
        name="near-me"
        size={22}
        color={accent}
        style={{ transform: [{ rotate: '45deg' }] }}
      />
    </XStack>
  );
}
