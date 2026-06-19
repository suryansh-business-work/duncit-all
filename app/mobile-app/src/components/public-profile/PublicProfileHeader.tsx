import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicProfileUser } from '@/hooks/usePublicProfile';
import type { RootStackParamList } from '@/navigation/types';

/** Centered avatar + name + location + bio — RN twin of mWeb's PublicProfileHeader.
 * The follower/following counts open that user's list (bug 9). */
export function PublicProfileHeader({ user }: Readonly<{ user: PublicProfileUser }>) {
  const { onPrimary, muted } = useThemeColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const location = [user.zone, user.city].filter(Boolean).join(', ');
  const initial = (user.full_name?.[0] ?? '?').toUpperCase();
  const openFollow = (tab: 'followers' | 'following') =>
    navigation.navigate('Follow', { userId: user.user_id, tab });

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
      <Text fontSize={12.5} color="$muted">
        @{user.username}
      </Text>
      <XStack gap={24} paddingVertical={2}>
        <XStack
          testID="public-followers"
          role="button"
          aria-label={`${user.followers_count} followers`}
          onPress={() => openFollow('followers')}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={14} fontWeight="900" color="$color">
            {user.followers_count}
          </Text>
          <Text fontSize={13} color="$muted">
            followers
          </Text>
        </XStack>
        <XStack
          testID="public-following"
          role="button"
          aria-label={`${user.following_count} following`}
          onPress={() => openFollow('following')}
          alignItems="center"
          gap={4}
          pressStyle={{ opacity: 0.7 }}
        >
          <Text fontSize={14} fontWeight="900" color="$color">
            {user.following_count}
          </Text>
          <Text fontSize={13} color="$muted">
            following
          </Text>
        </XStack>
      </XStack>
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
