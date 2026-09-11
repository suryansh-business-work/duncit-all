import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useRoleLabels } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { AccountMe } from '@/hooks/useAccount';
import { shareProfile } from '@/utils/share';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface AccountProfileHeaderProps {
  me: AccountMe;
  onEdit: () => void;
  onLogout: () => void;
  /** Refresh the screen after the photo/story changes. */
  onChanged?: () => void | Promise<void>;
}

type PillTone = 'neutral' | 'danger';

interface PillProps {
  testID: string;
  label: string;
  text: string;
  icon: 'edit' | 'share' | 'logout';
  tone?: PillTone;
  onPress: () => void;
}

/** One of the header's three soft pills — Edit, Share, Logout. */
function HeaderPill({ testID, label, text, icon, tone = 'neutral', onPress }: Readonly<PillProps>) {
  const { color, danger } = useThemeColors();
  const isDanger = tone === 'danger';
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      flex={1}
      height={44}
      alignItems="center"
      justifyContent="center"
      gap={6}
      borderRadius={999}
      backgroundColor={isDanger ? '$dangerSoft' : '$soft'}
      pressStyle={PRESS_STYLE.control}
    >
      <MaterialIcons name={icon} size={16} color={isDanger ? danger : color} />
      <Text fontSize={14} fontWeight="600" color={isDanger ? '$danger' : '$color'}>
        {text}
      </Text>
    </XStack>
  );
}

/** Avatar (Instagram-style photo/story control, items 9 + 12), name, bio, role
 * chips and the Edit/Logout actions — RN twin of mWeb's <AccountProfileHeader/>. */
export function AccountProfileHeader({
  me,
  onEdit,
  onLogout,
  onChanged,
}: Readonly<AccountProfileHeaderProps>) {
  const { t } = useTranslation();
  const { labelFor } = useRoleLabels();
  const initial = (me.first_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack gap={16} alignItems="center">
      <ProfileAvatar photo={me.profile_photo} initial={initial} size={88} onChanged={onChanged} />

      <YStack alignItems="center" gap={4} alignSelf="stretch">
        <Text fontSize={22} fontWeight="600" color="$color" textAlign="center">
          {me.full_name || `${me.first_name} ${me.last_name}`.trim()}
        </Text>
        {me.bio ? (
          <Text fontSize={14} color="$muted" textAlign="center">
            {me.bio}
          </Text>
        ) : null}
        <XStack flexWrap="wrap" gap={6} justifyContent="center" marginTop={8}>
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
      </YStack>

      <XStack gap={8} alignSelf="stretch">
        <HeaderPill
          testID="account-edit"
          label={t('mweb.account.editProfile')}
          text="Edit"
          icon="edit"
          onPress={onEdit}
        />
        <HeaderPill
          testID="account-share"
          label={t('mweb.common.shareProfile')}
          text="Share"
          icon="share"
          onPress={() => shareProfile(me.user_id, me.full_name ?? 'Profile', me.username)}
        />
        <HeaderPill
          testID="account-logout"
          label={t('mweb.common.logout')}
          text="Logout"
          icon="logout"
          tone="danger"
          onPress={onLogout}
        />
      </XStack>
    </YStack>
  );
}
