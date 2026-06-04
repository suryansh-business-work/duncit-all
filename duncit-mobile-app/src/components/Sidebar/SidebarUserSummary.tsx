import { Image } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useRoleLabels } from '@/hooks/useMe';

export interface SidebarUser {
  full_name?: string | null;
  first_name?: string | null;
  email?: string | null;
  profile_photo?: string | null;
  roles?: string[] | null;
}

/** Avatar + name + email + role chips — RN port of mWeb's <UserSummary/>. */
export function SidebarUserSummary({
  me,
  onPress,
}: {
  me?: SidebarUser | null;
  onPress: () => void;
}) {
  const { labelFor } = useRoleLabels();
  const roles = me?.roles ?? [];
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
        {roles.length > 0 ? (
          <XStack marginTop={6} flexWrap="wrap" gap={6}>
            {roles.map((r) => (
              <YStack
                key={r}
                borderRadius={999}
                backgroundColor="$primary"
                paddingHorizontal={8}
                paddingVertical={2}
              >
                <Text fontSize={11} fontWeight="700" color="$onPrimary">
                  {labelFor(r)}
                </Text>
              </YStack>
            ))}
          </XStack>
        ) : null}
      </YStack>
    </XStack>
  );
}
