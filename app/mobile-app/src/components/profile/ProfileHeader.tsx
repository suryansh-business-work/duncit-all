import { Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useRoleLabels } from '@/hooks/useMe';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { ProfileMe } from '@/hooks/useProfile';

function Stat({ value, label }: Readonly<{ value: number; label: string }>) {
  return (
    <YStack alignItems="center" flex={1}>
      <Text fontSize={18} fontWeight="900" color="$color">
        {value}
      </Text>
      <Text fontSize={12} fontWeight="700" color="$muted">
        {label}
      </Text>
    </YStack>
  );
}

/** Profile identity card — avatar, name, verified email, role chips, stats, bio. */
export function ProfileHeader({ me }: Readonly<{ me: ProfileMe }>) {
  const { onPrimary, primary } = useThemeColors();
  const { labelFor } = useRoleLabels();
  const initial = (me.first_name?.[0] ?? me.full_name?.[0] ?? 'U').toUpperCase();

  return (
    <YStack gap={14} padding={16}>
      <XStack gap={14} alignItems="center">
        <YStack
          width={76}
          height={76}
          borderRadius={999}
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
            <Text fontSize={30} fontWeight="900" color={onPrimary}>
              {initial}
            </Text>
          )}
        </YStack>
        <YStack flex={1} gap={3}>
          <Text fontSize={20} fontWeight="900" color="$color" numberOfLines={1}>
            {me.full_name ?? 'User'}
          </Text>
          <XStack alignItems="center" gap={5}>
            <Text fontSize={13} color="$muted" numberOfLines={1} flex={1}>
              {me.email ?? '—'}
            </Text>
            {me.is_email_verified ? (
              <MaterialIcons name="verified" size={15} color={primary} />
            ) : null}
          </XStack>
        </YStack>
      </XStack>

      {me.roles.length > 0 ? (
        <XStack gap={6} flexWrap="wrap">
          {me.roles.map((role) => (
            <XStack
              key={role}
              borderRadius={999}
              paddingHorizontal={10}
              paddingVertical={4}
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$borderColor"
            >
              <Text fontSize={11} fontWeight="800" color="$color">
                {labelFor(role)}
              </Text>
            </XStack>
          ))}
        </XStack>
      ) : null}

      <XStack
        padding={12}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
        backgroundColor="$surface"
      >
        <Stat value={me.followers_count} label="followers" />
        <Stat value={me.following_count} label="following" />
      </XStack>

      {me.bio ? (
        <Text fontSize={14} color="$color" lineHeight={20}>
          {me.bio}
        </Text>
      ) : null}
    </YStack>
  );
}
