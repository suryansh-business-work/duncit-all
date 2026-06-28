import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { ProfileAvatar } from '@/components/profile/ProfileAvatar';
import { useRoleLabels } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { AccountMe } from '@/hooks/useAccount';

export interface AccountProfileHeaderProps {
  me: AccountMe;
  onEdit: () => void;
  onLogout: () => void;
  /** Refresh the screen after the photo/story changes. */
  onChanged?: () => void | Promise<void>;
}

/** Avatar (Instagram-style photo/story control, items 9 + 12), name, bio, role
 * chips and the Edit/Logout actions — RN twin of mWeb's <AccountProfileHeader/>. */
export function AccountProfileHeader({
  me,
  onEdit,
  onLogout,
  onChanged,
}: Readonly<AccountProfileHeaderProps>) {
  const { color } = useThemeColors();
  const { labelFor } = useRoleLabels();
  const initial = (me.first_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack gap={16} alignItems="center">
      <ProfileAvatar photo={me.profile_photo} initial={initial} size={96} onChanged={onChanged} />

      <YStack alignItems="center" gap={6}>
        <Text fontSize={20} fontWeight="900" color="$color" textAlign="center">
          {me.full_name || `${me.first_name} ${me.last_name}`.trim()}
        </Text>
        {me.bio ? (
          <Text fontSize={13.5} color="$muted" textAlign="center">
            {me.bio}
          </Text>
        ) : null}
        <XStack flexWrap="wrap" gap={6} justifyContent="center" marginTop={4}>
          {me.roles.map((role) => (
            <XStack
              key={role}
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={3}
              borderWidth={1}
              borderColor="$primary"
            >
              <Text fontSize={11} fontWeight="800" color="$primary">
                {labelFor(role)}
              </Text>
            </XStack>
          ))}
        </XStack>
      </YStack>

      <XStack gap={10} alignSelf="stretch">
        <XStack
          testID="account-edit"
          role="button"
          aria-label="Edit profile"
          onPress={onEdit}
          flex={1}
          height={44}
          alignItems="center"
          justifyContent="center"
          gap={6}
          borderRadius={999}
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="edit" size={16} color={color} />
          <Text fontSize={14} fontWeight="800" color="$color">
            Edit
          </Text>
        </XStack>
        <XStack
          testID="account-logout"
          role="button"
          aria-label="Logout"
          onPress={onLogout}
          flex={1}
          height={44}
          alignItems="center"
          justifyContent="center"
          gap={6}
          borderRadius={999}
          borderWidth={1}
          borderColor="$danger"
          pressStyle={{ opacity: 0.85 }}
        >
          <MaterialIcons name="logout" size={16} color={semantic.error} />
          <Text fontSize={14} fontWeight="800" color="$danger">
            Logout
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
