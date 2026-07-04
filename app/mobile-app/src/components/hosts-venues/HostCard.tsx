import { AppImage } from '@/components/AppImage';

import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import type { PublicHost } from '@/hooks/useHostsVenues';

export interface HostCardProps {
  host: PublicHost;
  isMe: boolean;
  isFollowing: boolean;
  pending: boolean;
  onOpen: () => void;
  onToggleFollow: () => void;
}

/** Host row in the discovery list — avatar, name, address, tags + follow button.
 * RN twin of mWeb's HostList card. */
export function HostCard({
  host,
  isMe,
  isFollowing,
  pending,
  onOpen,
  onToggleFollow,
}: Readonly<HostCardProps>) {
  const { onPrimary } = useThemeColors();
  const initial = (host.full_name?.[0] ?? 'H').toUpperCase();

  return (
    <XStack
      testID={`host-card-${host.user_id}`}
      role="button"
      aria-label={host.full_name}
      onPress={onOpen}
      gap={12}
      padding={12}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      alignItems="center"
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={54}
        height={54}
        borderRadius={27}
        overflow="hidden"
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
      >
        {host.passport_photo_url ? (
          <AppImage
            source={{ uri: host.passport_photo_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <Text fontSize={20} fontWeight="900" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="900" color="$color" numberOfLines={1}>
          {host.full_name || 'Duncit host'}
        </Text>
        {host.full_address ? (
          <Text fontSize={12} color="$muted" numberOfLines={1}>
            {host.full_address}
          </Text>
        ) : null}
        {host.tags && host.tags.length > 0 ? (
          <Text fontSize={11} fontWeight="700" color="$primary" numberOfLines={1}>
            {host.tags.join(' · ')}
          </Text>
        ) : null}
      </YStack>
      {isMe ? null : (
        <FollowButton
          userId={host.user_id}
          isFollowing={isFollowing}
          pending={pending}
          onToggleFollow={onToggleFollow}
        />
      )}
    </XStack>
  );
}

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  pending: boolean;
  onToggleFollow: () => void;
}

/** Follow / Following pill with a busy spinner; no-ops while a toggle is pending. */
function FollowButton({
  userId,
  isFollowing,
  pending,
  onToggleFollow,
}: Readonly<FollowButtonProps>) {
  const { onPrimary, primary } = useThemeColors();
  return (
    <XStack
      testID={`host-follow-${userId}`}
      role="button"
      aria-label={isFollowing ? 'Unfollow' : 'Follow'}
      aria-disabled={pending}
      onPress={() => {
        if (!pending) onToggleFollow();
      }}
      alignItems="center"
      justifyContent="center"
      minWidth={92}
      height={34}
      borderRadius={999}
      borderWidth={isFollowing ? 1 : 0}
      borderColor="$borderColor"
      backgroundColor={isFollowing ? 'transparent' : '$primary'}
      opacity={pending ? 0.6 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      {pending ? (
        <Spinner size="small" color={isFollowing ? '$primary' : onPrimary} />
      ) : (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons
            name={isFollowing ? 'check' : 'person-add'}
            size={14}
            color={isFollowing ? primary : onPrimary}
          />
          <Text fontSize={12} fontWeight="800" color={isFollowing ? '$primary' : onPrimary}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}
