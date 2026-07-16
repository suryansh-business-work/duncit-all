import type { ComponentProps } from 'react';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

import {
  PublicProfileBadges,
  PublicProfileHeader,
  PublicProfilePosts,
} from '@/components/public-profile';
import { StackScreen } from '@/components/StackScreen';
import { usePublicProfile } from '@/hooks/usePublicProfile';
import type { RootStackParamList } from '@/navigation/types';
import { toErrorMessage } from '@/utils/errors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** Visual tokens for the two follow states, resolved once so FollowButton stays a
 * flat, low-complexity render (avoids a token ternary per JSX prop). */
type FollowView = Readonly<{
  aria: string;
  border: string;
  background: string;
  icon: IconName;
  iconColor: string;
  labelColor: string;
  label: string;
}>;

function followView(following: boolean, onPrimary: string, ink: string): FollowView {
  if (following) {
    return {
      aria: 'Unfollow user',
      border: '$primary',
      background: '$primary',
      icon: 'how-to-reg',
      iconColor: onPrimary,
      labelColor: '$onPrimary',
      label: 'Following',
    };
  }
  return {
    aria: 'Follow user',
    border: '$borderColor',
    background: 'transparent',
    icon: 'person-add-alt',
    iconColor: ink,
    labelColor: '$color',
    label: 'Follow',
  };
}

/** Follow/unfollow pill shown on someone else's profile (B4-12) — inert while busy. */
function FollowButton({
  following,
  followBusy,
  onPrimary,
  ink,
  onToggle,
}: Readonly<{
  following: boolean;
  followBusy: boolean;
  onPrimary: string;
  ink: string;
  onToggle: () => Promise<void>;
}>) {
  const view = followView(following, onPrimary, ink);
  return (
    <XStack
      testID="public-profile-follow"
      role="button"
      aria-label={view.aria}
      aria-disabled={followBusy}
      onPress={followBusy ? undefined : () => void onToggle()}
      alignSelf="center"
      alignItems="center"
      gap={8}
      paddingHorizontal={20}
      paddingVertical={10}
      borderRadius={999}
      borderWidth={1}
      borderColor={view.border}
      backgroundColor={view.background}
      opacity={followBusy ? 0.7 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      <MaterialIcons name={view.icon} size={18} color={view.iconColor} />
      <Text fontSize={14} fontWeight="900" color={view.labelColor}>
        {view.label}
      </Text>
    </XStack>
  );
}

/** Owner-only shortcut into the account editor. */
function EditProfileButton({ onPress }: Readonly<{ onPress: () => void }>) {
  return (
    <XStack
      testID="public-profile-edit"
      role="button"
      aria-label="Edit my profile"
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
      <Text fontSize={14} fontWeight="800" color="$color">
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
    following,
    followBusy,
    toggleFollow,
    isLoading,
    error,
  } = usePublicProfile(userId);
  const { onPrimary, color: ink } = useThemeColors();

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
          <FollowButton
            following={following}
            followBusy={followBusy}
            onPrimary={onPrimary}
            ink={ink}
            onToggle={toggleFollow}
          />
        )}
        {isOwner ? <EditProfileButton onPress={() => navigation.navigate('Account')} /> : null}
        <PublicProfileBadges badges={badges} />
        <PublicProfilePosts posts={posts} stories={stories} canView={canView} />
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
    <StackScreen title="Profile" testID="public-profile-screen">
      {body}
    </StackScreen>
  );
}
