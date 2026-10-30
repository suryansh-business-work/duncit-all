import { MaterialIcons } from '@expo/vector-icons';
import { Text, Theme, XStack, YStack, useTheme } from 'tamagui';
import { formatTutorialDuration } from '@duncit/utils';

import { useTranslation } from '@/hooks/useTranslation';
import type { TutorialItem } from '@/hooks/useTutorialFeed';
import { TutorialActionRail } from './TutorialActionRail';
import { TutorialVideo } from './TutorialVideo';

interface Props {
  item: TutorialItem;
  topicLabel: string;
  width: number;
  height: number;
  isActive: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
  onWatched: () => void;
}

function WatchedBadge() {
  const { t } = useTranslation();
  const onSuccess = useTheme().onSuccess?.val as string;
  return (
    <XStack
      testID="tutorial-watched-badge"
      aria-label={t('mweb.tutorials.watchedA11y')}
      alignSelf="flex-start"
      alignItems="center"
      gap={4}
      paddingHorizontal={10}
      paddingVertical={4}
      borderRadius={999}
      backgroundColor="$success"
    >
      <MaterialIcons name="check-circle" size={14} color={onSuccess} />
      <Text fontSize={12} fontWeight="600" color="$onSuccess">
        {t('mweb.tutorials.watched')}
      </Text>
    </XStack>
  );
}

/** One full-screen tutorial: the video, its caption and the action rail. Always
 * drawn on the dark theme so the overlay stays legible over any frame. */
export function TutorialReel({
  item,
  topicLabel,
  width,
  height,
  isActive,
  soundOn,
  onToggleSound,
  onLike,
  onComment,
  onShare,
  onWatched,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const meta = [topicLabel, formatTutorialDuration(item.duration_sec)].filter(Boolean).join(' · ');
  return (
    <Theme name="dark">
      <YStack
        width={width}
        height={height}
        backgroundColor="$background"
        testID={`tutorial-reel-${item.id}`}
      >
        <TutorialVideo
          url={item.video_url}
          isActive={isActive}
          muted={!soundOn}
          label={t('mweb.tutorials.videoLabel', { vars: { title: item.title } })}
          testID={`tutorial-video-${item.id}`}
          onWatched={onWatched}
        />
        <XStack
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          padding={16}
          paddingBottom={28}
          gap={12}
          alignItems="flex-end"
        >
          <YStack flex={1} gap={6}>
            {item.watched_by_me ? <WatchedBadge /> : null}
            <Text role="heading" fontSize={18} fontWeight="700" color="$color" numberOfLines={2}>
              {item.title}
            </Text>
            {meta ? (
              <Text fontSize={13} color="$muted">
                {meta}
              </Text>
            ) : null}
            {item.description ? (
              <Text fontSize={14} color="$color" numberOfLines={3}>
                {item.description}
              </Text>
            ) : null}
          </YStack>
          <TutorialActionRail
            item={item}
            soundOn={soundOn}
            onLike={onLike}
            onComment={onComment}
            onShare={onShare}
            onToggleSound={onToggleSound}
          />
        </XStack>
      </YStack>
    </Theme>
  );
}
