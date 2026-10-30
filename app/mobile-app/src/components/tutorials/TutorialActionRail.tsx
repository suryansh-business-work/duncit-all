import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { TutorialItem } from '@/hooks/useTutorialFeed';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface RailButtonProps {
  icon: IconName;
  label: string;
  count?: number;
  active?: boolean;
  testID: string;
  onPress: () => void;
}

function RailButton({
  icon,
  label,
  count,
  active = false,
  testID,
  onPress,
}: Readonly<RailButtonProps>) {
  const { color, accent } = useThemeColors();
  return (
    <YStack alignItems="center" gap={2}>
      <YStack
        testID={testID}
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-pressed={active}
        onPress={onPress}
        pressStyle={PRESS_STYLE.control}
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor="$background"
        opacity={0.85}
        alignItems="center"
        justifyContent="center"
      >
        <MaterialIcons name={icon} size={26} color={active ? accent : color} />
      </YStack>
      {count === undefined ? null : (
        <Text fontSize={12} fontWeight="600" color="$color">
          {count}
        </Text>
      )}
    </YStack>
  );
}

interface Props {
  item: TutorialItem;
  soundOn: boolean;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onToggleSound: () => void;
}

/** The right-hand action column on a tutorial: like, comments, share, sound. */
export function TutorialActionRail({
  item,
  soundOn,
  onLike,
  onComment,
  onShare,
  onToggleSound,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <YStack gap={16} alignItems="center">
      <RailButton
        testID={`tutorial-like-${item.id}`}
        icon={item.liked_by_me ? 'favorite' : 'favorite-border'}
        label={`${item.liked_by_me ? t('mweb.tutorials.unlike') : t('mweb.tutorials.like')}, ${t('mweb.tutorials.likesA11y', { vars: { count: item.like_count } })}`}
        count={item.like_count}
        active={item.liked_by_me}
        onPress={onLike}
      />
      <RailButton
        testID={`tutorial-comments-${item.id}`}
        icon="chat-bubble-outline"
        label={`${t('mweb.tutorials.comment')}, ${t('mweb.tutorials.commentsA11y', { vars: { count: item.comment_count } })}`}
        count={item.comment_count}
        onPress={onComment}
      />
      <RailButton
        testID={`tutorial-share-${item.id}`}
        icon="share"
        label={t('mweb.tutorials.share')}
        onPress={onShare}
      />
      <RailButton
        testID={`tutorial-sound-${item.id}`}
        icon={soundOn ? 'volume-up' : 'volume-off'}
        label={soundOn ? t('mweb.tutorials.mute') : t('mweb.tutorials.unmute')}
        onPress={onToggleSound}
      />
    </YStack>
  );
}
