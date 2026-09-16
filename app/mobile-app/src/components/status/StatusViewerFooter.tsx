import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import type { StatusSlide } from '@/hooks/useStatus';
import type { StoryTarget } from '@/hooks/useStoryRail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface StatusViewerFooterProps {
  /** The slide on screen; nothing below the media renders without one. */
  slide?: StatusSlide;
  /** Duncit's own pinned group — names its caption and link with the official
   * test ids, the same names mWeb uses. */
  official: boolean;
  /** Followers' stories only — the optimistic like state the viewer holds. */
  liked: boolean;
  likeCount: number;
  onToggleLike?: () => void;
  /** Own story only — open the "seen by" sheet for this slide (Bug 4). */
  onViewers?: (slideId: string) => void;
  /** The group's club/pod/user deep link, behind "Open details" (bug 3). */
  target?: StoryTarget;
  onOpenTarget?: (target: StoryTarget) => void;
  /** A Duncit status's own link, behind "See more". */
  onOpenLink?: (url: string) => void;
}

/** Followers' stories only — the heart with its running like count (Bug 5). */
function StatusLikeButton({
  liked,
  likeCount,
  onPress,
}: Readonly<{ liked: boolean; likeCount: number; onPress: () => void }>) {
  const { t } = useTranslation();
  const { accent } = useThemeColors();
  return (
    <XStack paddingHorizontal={16} paddingTop={8} alignItems="center" gap={8}>
      <XStack
        testID="status-like"
        role="button"
        tabIndex={0}
        hitSlop={8}
        aria-label={liked ? t('mweb.a11y.unlikeStory') : t('mweb.a11y.likeStory')}
        onPress={onPress}
        alignItems="center"
        gap={6}
        pressStyle={PRESS_STYLE.row}
      >
        <MaterialIcons
          name={liked ? 'favorite' : 'favorite-border'}
          size={26}
          color={liked ? accent : '#ffffff'}
        />
        {likeCount > 0 ? (
          <Text testID="status-like-count" fontSize={14} fontWeight="600" color="#ffffff">
            {likeCount}
          </Text>
        ) : null}
      </XStack>
    </XStack>
  );
}

/** The full-width action under a slide — "Open details" on a rail item, "See
 * more" on a Duncit status. They differ only by label and by what they open. */
function StatusActionButton({
  testID,
  label,
  onPress,
}: Readonly<{ testID: string; label: string; onPress: () => void }>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack paddingHorizontal={16} paddingBottom={12}>
      <XStack
        testID={testID}
        role="button"
        tabIndex={0}
        aria-label={label}
        onPress={onPress}
        flex={1}
        height={52}
        alignItems="center"
        justifyContent="center"
        gap={6}
        borderRadius={999}
        backgroundColor="$primary"
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="600" color={onPrimary}>
          {label}
        </Text>
        <MaterialIcons name="arrow-forward" size={16} color={onPrimary} />
      </XStack>
    </XStack>
  );
}

/**
 * Everything under a slide's media: its caption, the like heart, the owner's
 * "Viewers" row and the action button. Extracted from StatusViewer, which owns
 * the timers and the tap zones — this is the half that only reads the slide.
 */
export function StatusViewerFooter({
  slide,
  official,
  liked,
  likeCount,
  onToggleLike,
  onViewers,
  target,
  onOpenTarget,
  onOpenLink,
}: Readonly<StatusViewerFooterProps>) {
  const { t } = useTranslation();
  const link = slide?.linkUrl ?? null;
  return (
    <>
      {slide?.caption ? (
        <Text
          testID={official ? 'status-official-caption' : undefined}
          color="#ffffff"
          fontSize={14}
          textAlign="center"
          padding={16}
        >
          {slide.caption}
        </Text>
      ) : null}
      {onToggleLike && slide ? (
        <StatusLikeButton liked={liked} likeCount={likeCount} onPress={onToggleLike} />
      ) : null}
      {onViewers && slide ? (
        <XStack paddingHorizontal={16} paddingTop={8}>
          <XStack
            testID="status-viewers"
            role="button"
            tabIndex={0}
            hitSlop={8}
            aria-label={t('mweb.common.seeWhoViewedThisStory')}
            onPress={() => onViewers(slide.id)}
            alignItems="center"
            gap={6}
            pressStyle={PRESS_STYLE.row}
          >
            <MaterialIcons name="visibility" size={20} color="#ffffff" />
            <Text fontSize={13} fontWeight="600" color="#ffffff">
              Viewers
            </Text>
          </XStack>
        </XStack>
      ) : null}
      {target && onOpenTarget ? (
        <StatusActionButton
          testID="status-open-target"
          label={t('mweb.status.openDetails')}
          onPress={() => onOpenTarget(target)}
        />
      ) : null}
      {link && onOpenLink ? (
        <StatusActionButton
          testID="status-official-link"
          label={t('mweb.status.officialOpenLink')}
          onPress={() => onOpenLink(link)}
        />
      ) : null}
    </>
  );
}
