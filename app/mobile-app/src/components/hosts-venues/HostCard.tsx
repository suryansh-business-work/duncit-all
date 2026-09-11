import { AppImage } from '@/components/AppImage';

import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { FOLLOW_LABEL_KEY, type FollowStatus } from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
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

/** Host row in the discovery list — avatar, name, address, tags + follow button,
 * on a surface card. RN twin of mWeb's HostList card. */
export function HostCard({
  host,
  isMe,
  status,
  pending,
  onOpen,
  onToggleFollow,
}: Readonly<HostCardProps>) {
  const { accent } = useThemeColors();
  const tags = (host.tags ?? []).slice(0, 3);

  return (
    <SurfaceCard
      testID={`host-card-${host.user_id}`}
      role="button"
      aria-label={host.full_name}
      onPress={onOpen}
      flexDirection="row"
      gap={12}
      alignItems="center"
      pressStyle={PRESS_STYLE.surface}
    >
      <YStack
        width={56}
        height={56}
        borderRadius={28}
        overflow="hidden"
        backgroundColor="$soft"
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
          <MaterialIcons name="person-outline" size={26} color={accent} />
        )}
      </YStack>
      <YStack flex={1} gap={2}>
        <Text fontSize={16} fontWeight="600" color="$color" numberOfLines={1}>
          {host.full_name || 'Duncit host'}
        </Text>
        {host.full_address ? (
          <Text fontSize={13} color="$muted" numberOfLines={1}>
            {host.full_address}
          </Text>
        ) : null}
        {tags.length > 0 ? (
          <XStack gap={4} flexWrap="wrap" marginTop={4}>
            {tags.map((tag) => (
              <XStack
                key={tag}
                height={24}
                paddingHorizontal={10}
                borderRadius={999}
                alignItems="center"
                backgroundColor="$soft"
              >
                <Text fontSize={11} fontWeight="600" color="$color" numberOfLines={1}>
                  {tag}
                </Text>
              </XStack>
            ))}
          </XStack>
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
    </SurfaceCard>
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
 * toggle is pending. Green in the resting state — both live states (a pending
 * ask, an existing follow) read as a soft pill. mWeb twin: FollowButton. */
function FollowButton({ userId, status, pending, onToggleFollow }: Readonly<FollowButtonProps>) {
  const { onPrimary, color } = useThemeColors();
  const { t } = useTranslation();
  const filled = status === 'NONE';
  const ink = filled ? onPrimary : color;
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
      paddingHorizontal={12}
      borderRadius={999}
      backgroundColor={filled ? '$primary' : '$soft'}
      opacity={pending ? 0.6 : 1}
      pressStyle={filled ? PRESS_STYLE.solid : PRESS_STYLE.control}
    >
      {pending ? (
        <Spinner size="small" color={ink} />
      ) : (
        <XStack alignItems="center" gap={4}>
          <MaterialIcons name={ICON[status]} size={14} color={ink} />
          <Text fontSize={12} fontWeight="600" color={filled ? '$onPrimary' : '$color'}>
            {t(FOLLOW_LABEL_KEY[status])}
          </Text>
        </XStack>
      )}
    </XStack>
  );
}
