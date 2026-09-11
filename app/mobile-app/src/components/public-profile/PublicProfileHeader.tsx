import { AppImage } from '@/components/AppImage';

import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicProfileUser } from '@/hooks/usePublicProfile';
import type { RootStackParamList } from '@/navigation/types';
import { PRESS_STYLE } from '@duncit/buttons-native';

function CountStat({
  value,
  label,
  onPress,
  testID,
}: Readonly<{ value: number; label: string; onPress: () => void; testID: string }>) {
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={`${value} ${label}`}
      onPress={onPress}
      flex={1}
      alignItems="center"
      paddingVertical={12}
      pressStyle={PRESS_STYLE.row}
    >
      <Text fontSize={18} fontWeight="700" color="$color">
        {value}
      </Text>
      <Text fontSize={12} fontWeight="500" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

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
    <YStack alignItems="center" gap={16}>
      <YStack
        width={88}
        height={88}
        borderRadius={44}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {user.profile_photo ? (
          <AppImage
            source={{ uri: user.profile_photo }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={34} fontWeight="600" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>
      <YStack alignItems="center" gap={4} alignSelf="stretch">
        <Text fontSize={22} fontWeight="600" color="$color" textAlign="center">
          {user.full_name || 'Duncit user'}
        </Text>
        <Text fontSize={14} fontWeight="500" color="$muted">
          @{user.username}
        </Text>
        {location ? (
          <XStack alignItems="center" gap={4}>
            <MaterialIcons name="place" size={16} color={muted} />
            <Text fontSize={14} color="$muted">
              {location}
            </Text>
          </XStack>
        ) : null}
        {user.bio ? (
          <Text fontSize={14} lineHeight={20} color="$color" textAlign="center" marginTop={4}>
            {user.bio}
          </Text>
        ) : null}
      </YStack>
      <SurfaceCard flexDirection="row" alignSelf="stretch" padding={0}>
        <CountStat
          testID="public-followers"
          value={user.followers_count}
          label="followers"
          onPress={() => openFollow('followers')}
        />
        <YStack width={1} marginVertical={12} backgroundColor="$borderColor" />
        <CountStat
          testID="public-following"
          value={user.following_count}
          label="following"
          onPress={() => openFollow('following')}
        />
      </SurfaceCard>
    </YStack>
  );
}
