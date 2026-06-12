import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface SidebarUser {
  full_name?: string | null;
  first_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
  roles?: string[] | null;
}

/** Avatar + name + email card that opens the profile — RN port of mWeb's
 * <UserSummary/>. Roles intentionally do not appear here — the studio switcher
 * communicates the active role. */
export function SidebarUserSummary({
  me,
  onPress,
}: Readonly<{
  me?: SidebarUser | null;
  onPress: () => void;
}>) {
  const { muted } = useThemeColors();
  const initial = (me?.first_name?.[0] ?? me?.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <XStack
      testID="sidebar-user-summary"
      role="button"
      onPress={onPress}
      marginHorizontal={16}
      marginBottom={12}
      alignItems="center"
      gap={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      padding={12}
      pressStyle={{ opacity: 0.85, borderColor: '$primary' }}
    >
      {me?.profile_photo ? (
        <Image
          source={{ uri: me.profile_photo }}
          style={{ width: 52, height: 52, borderRadius: 26 }}
        />
      ) : (
        <YStack
          width={52}
          height={52}
          alignItems="center"
          justifyContent="center"
          borderRadius={26}
          backgroundColor="$primary"
        >
          <Text fontSize={20} fontWeight="800" color="$onPrimary">
            {initial}
          </Text>
        </YStack>
      )}
      <YStack flex={1}>
        <Text numberOfLines={1} fontSize={16} fontWeight="800" color="$color">
          {me?.full_name ?? 'User'}
        </Text>
        <Text numberOfLines={1} fontSize={12} color="$muted">
          {me?.email ?? '—'}
        </Text>
        <Text fontSize={12} fontWeight="800" color="$primary" paddingTop={2}>
          View profile
        </Text>
      </YStack>
      <MaterialIcons name="chevron-right" size={20} color={muted} />
    </XStack>
  );
}
