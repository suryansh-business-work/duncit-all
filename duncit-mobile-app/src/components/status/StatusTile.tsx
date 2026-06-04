import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface StatusTileProps {
  label: string;
  image?: string | null;
  ring?: boolean;
  badge?: boolean;
  onPress?: () => void;
  testID?: string;
}

/** A circular story avatar with a label; an optional "+" badge marks the
 * upload tile and a coloured ring marks an unseen/own status. */
export function StatusTile({ label, image, ring, badge, onPress, testID }: StatusTileProps) {
  const { onPrimary } = useThemeColors();
  const initial = (label[0] ?? '?').toUpperCase();

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      width={70}
      alignItems="center"
      gap={6}
      pressStyle={{ opacity: 0.8 }}
    >
      <YStack
        width={64}
        height={64}
        borderRadius={999}
        borderWidth={2.5}
        borderColor={ring ? '$primary' : '$borderColor'}
        backgroundColor="$muted"
        alignItems="center"
        justifyContent="center"
        overflow="hidden"
      >
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={22} fontWeight="900" color="$onPrimary">
            {initial}
          </Text>
        )}
      </YStack>
      {badge ? (
        <YStack
          position="absolute"
          top={42}
          right={6}
          width={22}
          height={22}
          borderRadius={11}
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
          borderWidth={2}
          borderColor="$background"
        >
          <MaterialIcons name="add" size={13} color={onPrimary} />
        </YStack>
      ) : null}
      <Text fontSize={11} fontWeight="700" color="$color" numberOfLines={1}>
        {label}
      </Text>
    </YStack>
  );
}
