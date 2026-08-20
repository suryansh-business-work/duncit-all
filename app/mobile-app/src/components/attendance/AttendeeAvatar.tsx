import { Image } from 'expo-image';
import { Text, YStack } from 'tamagui';

interface Props {
  uri: string;
  name: string;
  size: number;
}

/**
 * A person's picture, or their initial.
 *
 * Its own module-scope component rather than a branch inside each row: Sonar
 * S6478 forbids declaring a component inside another, and both the roster row
 * and the club-admin card need the same fallback.
 */
export function AttendeeAvatar({ uri, name, size }: Readonly<Props>) {
  const radius = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        contentFit="cover"
      />
    );
  }
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={radius}
      alignItems="center"
      justifyContent="center"
      backgroundColor="$surface"
    >
      <Text fontSize={size / 2.6} fontWeight="700" color="$muted">
        {(name.slice(0, 1) || '?').toUpperCase()}
      </Text>
    </YStack>
  );
}
