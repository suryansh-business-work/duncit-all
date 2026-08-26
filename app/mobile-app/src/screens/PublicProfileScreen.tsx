import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { useTranslation } from '@/hooks/useTranslation';

import {
  ProfileFollowActions,
  PublicProfileBadges,
  PublicProfileHeader,
  PublicProfilePosts,
} from '@/components/public-profile';
import { StackScreen } from '@/components/StackScreen';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

/** Owner-only shortcut into the account editor. */
function EditProfileButton({ onPress }: Readonly<{ onPress: () => void }>) {
  const { t } = useTranslation();
  return (
    <XStack
      testID="public-profile-edit"
      role="button"
      aria-label={t('mweb.publicProfile.editMyProfile')}
      onPress={onPress}
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
      <Text fontSize={14} fontWeight="600" color="$color">
        Edit my profile
      </Text>
    </XStack>
  );
}

/** A user's public profile — header, owner actions (when it's you) and badges.
 * RN twin of mWeb's PublicProfilePage. */
export function PublicProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'PublicProfile'>>();
  const userId = route.params?.userId ?? '';
  const {
    user,
    isOwner,
    badges,
    posts,
    stories,
    canView,
    followStatus,
    followBusy,
    followsViewer,
    inboundRequestId,
    answerBusy,
    toggleFollow,
    answerRequest,
    isLoading,
    error,
  } = usePublicProfile(userId);
  const { t } = useTranslation();

  let body;
  if (isLoading && !user) {
    body = (
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Spinner testID="public-profile-loading" color="$primary" />
      </YStack>
    );
  } else if (error) {
    body = (
      <Text testID="public-profile-error" padding={24} color="$danger">
        {toErrorMessage(error)}
      </Text>
    );
  } else if (user) {
    body = (
      <ScrollView flex={1} contentContainerStyle={{ padding: 16, gap: 16 }}>
        <PublicProfileHeader user={user} />
        {isOwner ? null : (
          <ProfileFollowActions
            followStatus={followStatus}
            followsViewer={followsViewer}
            followBusy={followBusy}
            inboundRequestId={inboundRequestId}
            answerBusy={answerBusy}
            onToggleFollow={toggleFollow}
            onAnswer={answerRequest}
          />
        )}
        {isOwner ? <EditProfileButton onPress={() => navigation.navigate('Account')} /> : null}
        <PublicProfileBadges badges={badges} />
        <PublicProfilePosts
          posts={posts}
          stories={stories}
          canView={canView}
          authorId={user.user_id}
          authorName={user.full_name || user.username || ''}
          authorPhoto={user.profile_photo}
        />
      </ScrollView>
    );
  } else {
    body = (
      <Text testID="public-profile-missing" padding={24} color="$muted">
        User not found.
      </Text>
    );
  }

  return (
    <StackScreen title={t('mweb.publicProfile.profile')} testID="public-profile-screen">
      {body}
    </StackScreen>
  );
}
