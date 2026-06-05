import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicProfileUser } from '@/hooks/usePublicProfile';

/** Centered avatar + name + location + bio — RN twin of mWeb's PublicProfileHeader. */
export function PublicProfileHeader({ user }: { user: PublicProfileUser }) {
  const { onPrimary, muted } = useThemeColors();
  const location = [user.zone, user.city].filter(Boolean).join(', ');
  const initial = (user.full_name?.[0] ?? '?').toUpperCase();

  return (
    <YStack alignItems="center" gap={10} paddingVertical={8}>
      <YStack
        width={96}
        height={96}
        borderRadius={48}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {user.profile_photo ? (
          <Image
            source={{ uri: user.profile_photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={36} fontWeight="900" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>
      <Text fontSize={20} fontWeight="900" color="$color" textAlign="center">
        {user.full_name || 'Duncit user'}
      </Text>
      {location ? (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name="place" size={14} color={muted} />
          <Text fontSize={13} color="$muted">
            {location}
          </Text>
        </XStack>
      ) : null}
      {user.bio ? (
        <Text fontSize={13.5} color="$muted" textAlign="center">
          {user.bio}
        </Text>
      ) : null}
    </YStack>
  );
}
