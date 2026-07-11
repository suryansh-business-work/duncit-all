import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

export interface SidebarIdentityUser {
  full_name?: string | null;
  first_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
}

/** Compact identity row — name + inline chevron + email on the left, a small
 * 44px avatar on the right; the whole row opens the profile. RN port of mWeb's
 * <ProfileIdentity/>. */
export function SidebarProfileIdentity({
  me,
  onPress,
}: Readonly<{ me?: SidebarIdentityUser | null; onPress: () => void }>) {
  const { muted } = useThemeColors();
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <XStack
      testID="sidebar-identity"
      role="button"
      aria-label="Open your profile"
      onPress={onPress}
      alignItems="center"
      justifyContent="space-between"
      gap={12}
      marginHorizontal={16}
      marginVertical={8}
      paddingHorizontal={12}
      paddingVertical={8}
      borderRadius={12}
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack flex={1} minWidth={0}>
        <XStack alignItems="center" gap={2}>
          <Text numberOfLines={1} fontSize={15} fontWeight="800" color="$color">
            {me?.full_name ?? 'User'}
          </Text>
          <MaterialIcons name="chevron-right" size={16} color={muted} />
        </XStack>
        {me?.email ? (
          <Text numberOfLines={1} fontSize={12} color="$muted">
            {me.email}
          </Text>
        ) : null}
      </YStack>
      {me?.profile_photo ? (
        <AppImage
          source={{ uri: me.profile_photo }}
          style={{ width: 44, height: 44, borderRadius: 22 }}
        />
      ) : (
        <YStack
          width={44}
          height={44}
          alignItems="center"
          justifyContent="center"
          borderRadius={22}
          backgroundColor="$primary"
        >
          <Text fontSize={18} fontWeight="800" color="$onPrimary">
            {initial}
          </Text>
        </YStack>
      )}
    </XStack>
  );
}
