import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useRoleLabels } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { AccountMe } from '@/hooks/useAccount';

export interface AccountProfileHeaderProps {
  me: AccountMe;
  savingPhoto: boolean;
  onChangePhoto: () => void;
  onEdit: () => void;
  onLogout: () => void;
}

/** Avatar (with change-photo overlay), name, bio, role/status chips and the
 * Edit/Logout actions — RN twin of mWeb's <AccountProfileHeader/>. */
export function AccountProfileHeader({
  me,
  savingPhoto,
  onChangePhoto,
  onEdit,
  onLogout,
}: AccountProfileHeaderProps) {
  const { onPrimary, color, primary } = useThemeColors();
  const { labelFor } = useRoleLabels();
  const initial = (me.first_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack gap={16} alignItems="center">
      <YStack>
        <YStack
          width={96}
          height={96}
          borderRadius={48}
          overflow="hidden"
          backgroundColor="$primary"
          alignItems="center"
          justifyContent="center"
        >
          {me.profile_photo ? (
            <Image
              source={{ uri: me.profile_photo }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <Text fontSize={36} fontWeight="900" color={onPrimary}>
              {initial}
            </Text>
          )}
        </YStack>
        <XStack
          testID="account-change-photo"
          role="button"
          aria-label="Change photo"
          aria-disabled={savingPhoto}
          onPress={savingPhoto ? undefined : onChangePhoto}
          position="absolute"
          bottom={0}
          right={0}
          width={34}
          height={34}
          borderRadius={17}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$surface"
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ opacity: 0.8 }}
        >
          {savingPhoto ? (
            <Spinner size="small" color="$primary" />
          ) : (
            <MaterialIcons name="photo-camera" size={16} color={primary} />
          )}
        </XStack>
      </YStack>

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
          {me.status ? (
            <XStack
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={3}
              backgroundColor="$surface"
            >
              <Text fontSize={11} fontWeight="800" color="$color">
                {me.status}
              </Text>
            </XStack>
          ) : null}
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
