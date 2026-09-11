import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { DuncitButton } from '@/components/DuncitButton';
import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { ProfileHandleLink } from '@/components/profile/ProfileHandleLink';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useRoleLabels } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfileMe } from '@/hooks/useProfile';
import type { RootStackParamList } from '@/navigation/types';
import { shareProfile } from '@/utils/share';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

function Stat({
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
      alignItems="center"
      flex={1}
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

/** Profile identity — avatar, name, verified email, role chips, bio, stats.
 * Tapping the follower/following counts opens the list (bug 9). The avatar is the
 * Instagram-style photo/story control (items 9 + 12). */
export function ProfileHeader({
  me,
  onChanged,
}: Readonly<{ me: ProfileMe; onChanged?: () => void | Promise<void> }>) {
  const { t } = useTranslation();
  const { primary, color } = useThemeColors();
  const { labelFor } = useRoleLabels();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const openFollow = (tab: 'followers' | 'following') =>
    navigation.navigate('Follow', { userId: me.user_id, tab });
  const initial = (me.first_name?.[0] ?? me.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack gap={16} padding={16} alignItems="center">
      <ProfileAvatar photo={me.profile_photo} initial={initial} size={88} onChanged={onChanged} />
      <YStack gap={4} alignItems="center" alignSelf="stretch">
        {/* The tick sits beside the NAME and is the only thing that says the
            email is verified (mWeb shows the same, rule 27). */}
        <XStack alignItems="center" justifyContent="center" gap={5}>
          <Text fontSize={22} fontWeight="600" color="$color" numberOfLines={1} flexShrink={1}>
            {me.full_name ?? 'User'}
          </Text>
          {me.is_email_verified ? (
            <MaterialIcons
              name="verified"
              size={19}
              color={primary}
              accessibilityLabel="Email verified"
            />
          ) : null}
        </XStack>
        {/* The handle is also the share link — tapping it copies `/u/<handle>`. */}
        <ProfileHandleLink username={me.username ?? null} fallback={me.email ?? '—'} />
        {me.bio ? (
          <Text fontSize={14} color="$color" lineHeight={20} textAlign="center" marginTop={4}>
            {me.bio}
          </Text>
        ) : null}
      </YStack>

      {me.roles.length > 0 ? (
        <XStack gap={6} flexWrap="wrap" justifyContent="center">
          {me.roles.map((role) => (
            <XStack
              key={role}
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={4}
              backgroundColor="$soft"
            >
              <Text fontSize={11} fontWeight="600" color="$color">
                {labelFor(role)}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : null}

      <SurfaceCard flexDirection="row" alignSelf="stretch" padding={0}>
        <Stat
          testID="profile-followers"
          value={me.followers_count}
          label="followers"
          onPress={() => openFollow('followers')}
        />
        <YStack width={1} marginVertical={12} backgroundColor="$borderColor" />
        <Stat
          testID="profile-following"
          value={me.following_count}
          label="following"
          onPress={() => openFollow('following')}
        />
      </SurfaceCard>

      <YStack alignSelf="stretch">
        <DuncitButton
          testID="profile-share"
          label={t('mweb.common.shareProfile')}
          variant="soft"
          tone="neutral"
          fullWidth
          icon={<MaterialIcons name="share" size={16} color={color} />}
          onPress={() => shareProfile(me.user_id, me.full_name ?? 'Profile', me.username)}
        />
      </YStack>
    </YStack>
  );
}
