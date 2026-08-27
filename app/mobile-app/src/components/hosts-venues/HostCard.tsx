import { AppImage } from '@/components/AppImage';

import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { FOLLOW_LABEL_KEY, type FollowStatus } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { PublicHost } from '@/hooks/useHostsVenues';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface HostCardProps {
  host: PublicHost;
  isMe: boolean;
  /** Follow / Requested / Following — read off the viewer's own lists, so a
   * private host whose ask is still open reads Requested, not Follow. */
  status: FollowStatus;
  pending: boolean;
  onOpen: () => void;
  onToggleFollow: () => void;
}

/** Host row in the discovery list — avatar, name, address, tags + follow button.
 * RN twin of mWeb's HostList card. */
export function HostCard({
  host,
  isMe,
  status,
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
      pressStyle={PRESS_STYLE.control}
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
          <Text fontSize={20} fontWeight="700" color={onPrimary}>
            {initial}
          </Text>
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={15} fontWeight="700" color="$color" numberOfLines={1}>
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
          status={status}
          pending={pending}
          onToggleFollow={onToggleFollow}
        />
      )}
    </XStack>
  );
}

type IconName = ComponentProps<typeof MaterialIcons>['name'];

const ICON: Record<FollowStatus, IconName> = {
  NONE: 'person-add',
  REQUESTED: 'hourglass-top',
  FOLLOWING: 'check',
};
const ARIA: Record<FollowStatus, string> = {
  NONE: 'Follow',
  REQUESTED: 'Withdraw follow request',
  FOLLOWING: 'Unfollow',
};

interface FollowButtonProps {
  userId: string;
  status: FollowStatus;
  pending: boolean;
  onToggleFollow: () => void;
}

/** Follow / Requested / Following pill with a busy spinner; no-ops while a
 * toggle is pending. Filled only in the resting state — both live states
 * (a pending ask, an existing follow) read as outlined. */
function FollowButton({ userId, status, pending, onToggleFollow }: Readonly<FollowButtonProps>) {
  const { onPrimary, primary } = useThemeColors();
  const { t } = useTranslation();
  const filled = status === 'NONE';
  const ink = filled ? onPrimary : primary;
  return (
    <XStack
      testID={`host-follow-${userId}`}
      role="button"
      aria-label={ARIA[status]}
      aria-disabled={pending}
      onPress={() => {
        if (!pending) onToggleFollow();
      }}
      alignItems="center"
      justifyContent="center"
      minWidth={92}
      height={34}
      borderRadius={999}
      borderWidth={filled ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={filled ? '$primary' : 'transparent'}
      opacity={pending ? 0.6 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      {pending ? (
        <Spinner size="small" color={ink} />
      ) : (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name={ICON[status]} size={14} color={ink} />
          <Text fontSize={12} fontWeight="600" color={ink}>
            {t(FOLLOW_LABEL_KEY[status])}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}
