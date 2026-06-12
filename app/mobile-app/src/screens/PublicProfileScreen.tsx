import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

import { PublicProfileBadges, PublicProfileHeader } from '@/components/public-profile';
import { StackScreen } from '@/components/StackScreen';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** A user's public profile — header, owner actions (when it's you) and badges.
 * RN twin of mWeb's PublicProfilePage. */
export function PublicProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PublicProfile'>>();
  const userId = route.params?.userId ?? '';
  const { user, isOwner, badges, following, followBusy, toggleFollow, isLoading, error } =
    usePublicProfile(userId);
  const { onPrimary, color: ink } = useThemeColors();

  return (
    <StackScreen title="Profile" testID="public-profile-screen">
      {isLoading && !user ? (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner testID="public-profile-loading" color="$primary" />
        </YStack>
      ) : error ? (
        <Text testID="public-profile-error" padding={24} color="$danger">
          {toErrorMessage(error)}
        </Text>
      ) : !user ? (
        <Text testID="public-profile-missing" padding={24} color="$muted">
          User not found.
        </Text>
      ) : (
        <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <PublicProfileHeader user={user} />
          {!isOwner ? (
            <XStack
              testID="public-profile-follow"
              role="button"
              aria-label={following ? 'Unfollow user' : 'Follow user'}
              aria-disabled={followBusy}
              onPress={followBusy ? undefined : () => void toggleFollow()}
              alignSelf="center"
              alignItems="center"
              gap={8}
              paddingHorizontal={20}
              paddingVertical={10}
              borderRadius={999}
              borderWidth={1}
              borderColor={following ? '$primary' : '$borderColor'}
              backgroundColor={following ? '$primary' : 'transparent'}
              opacity={followBusy ? 0.7 : 1}
              pressStyle={{ opacity: 0.85 }}
            >
              <MaterialIcons
                name={following ? 'how-to-reg' : 'person-add-alt'}
                size={18}
                color={following ? onPrimary : ink}
              />
              <Text fontSize={14} fontWeight="900" color={following ? '$onPrimary' : '$color'}>
                {following ? 'Following' : 'Follow'}
              </Text>
            </XStack>
          ) : null}
          {isOwner ? (
            <XStack
              testID="public-profile-edit"
              role="button"
              aria-label="Edit my profile"
              onPress={() => navigation.navigate('Account')}
              alignSelf="center"
              alignItems="center"
              gap={6}
              paddingHorizontal={18}
              paddingVertical={10}
              borderRadius={999}
              borderWidth={1}
              borderColor="$borderColor"
              pressStyle={{ opacity: 0.85 }}
            >
              <Text fontSize={14} fontWeight="800" color="$color">
                Edit my profile
              </Text>
            </XStack>
          ) : null}
          <PublicProfileBadges badges={badges} />
        </ScrollView>
      )}
    </StackScreen>
  );
}
