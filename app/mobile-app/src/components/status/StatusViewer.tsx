import { useEffect, useRef, useState } from 'react';
import { Modal } from 'react-native';
import { AppImage } from '@/components/AppImage';

import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { ModalThemeScope } from '@/components/ModalThemeScope';
import { StatusVideo } from '@/components/status/StatusVideo';
import type { StatusGroup } from '@/hooks/useStatus';
import type { StoryTarget } from '@/hooks/useStoryRail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { statusRemainingLabel } from '@/utils/date-format';
import { resolveSwipe } from '@/utils/swipe';

/** A viewer item: an author's story group, optionally carrying a sub-label and a
 * deep-link target (followed club/pod/user) for the "Open details" button. */
type ViewerStatus = StatusGroup & { subLabel?: string | null; target?: StoryTarget };

interface StatusViewerProps {
  status: ViewerStatus | null;
  onClose: () => void;
  /** Jump to the next author's story (auto-advance past the last slide, tap on
   * the right edge of the last slide, or swipe left). Falls back to onClose. */
  onNext?: () => void;
  /** Jump to the previous author's story (tap on the left edge of the first
   * slide, or swipe right). */
  onPrev?: () => void;
  /** Navigate to the item's club/pod/user when "Open details" is tapped (bug 3). */
  onOpenTarget?: (target: StoryTarget) => void;
  /** Own story only — delete the currently shown slide via the kebab menu (Bug 7). */
  onDelete?: (slideId: string) => void;
  /** Own story only — open the "seen by" viewers sheet for a slide (Bug 4). */
  onViewers?: (slideId: string) => void;
  /** Followers' stories only — like/unlike the current slide (Bug 5). */
  onToggleLike?: (slideId: string) => void;
  /** Record that a slide was shown so its ring greys (Bug 2). */
  onSlideSeen?: (slideId: string) => void;
}

// Each slide runs 15s (images and videos alike); a video that ends sooner
// advances immediately. The 15s ceiling keeps a long clip from holding the
// story open (Bugs 3 & 8).
const IMAGE_DURATION_MS = 15000;
const VIDEO_CAP_MS = 15000;
const TICK_MS = 100;

/* istanbul ignore next -- placeholder ref value, replaced on the first render */
const NOOP = () => undefined;

/** Full-screen story viewer — multi-slide, auto-advancing (15s per image, video
 * to its end), with tap zones for manual prev/next and a close button. */
export function StatusViewer({
  status,
  onClose,
  onNext,
  onPrev,
  onOpenTarget,
  onDelete,
  onViewers,
  onToggleLike,
  onSlideSeen,
}: Readonly<StatusViewerProps>) {
  const { onPrimary } = useThemeColors();
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const slides = status?.slides ?? [];
  const current = slides[index];
  const isVideo = current?.mediaType === 'VIDEO';
  // Countdown until the status is auto-removed (recomputed per slide change).
  const remaining = statusRemainingLabel(current?.expiresAt);

  // Past the last slide, hand off to the next author's story (bug 2); if there
  // is none, close. A bare onClose is the fallback when no sibling exists.
  const goNextAuthor = onNext ?? onClose;

  const advanceRef = useRef(NOOP);
  advanceRef.current = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
      setProgress(0);
    } else {
      goNextAuthor();
    }
  };

  // Horizontal swipe between authors (bug 2): capture the touch start, then on
  // release decide next/prev from the net x-distance.
  const swipeStartX = useRef(0);
  const onSwipeRelease = (endX: number) => {
    const intent = resolveSwipe(endX - swipeStartX.current);
    if (intent === 'next') goNextAuthor();
    else if (intent === 'prev') onPrev?.();
  };

  // Reset to the first slide whenever a new author's story opens.
  useEffect(() => {
    setIndex(0);
    setProgress(0);
  }, [status]);

  // Per-slide setup: seed the like button, close any open menu, and record the
  // view so the ring greys (Bugs 2 & 5). Keyed on the slide id + its like values
  // (primitives) so an unrelated store update never resets a local like toggle.
  const currentId = current?.id;
  const currentLiked = current?.likedByMe ?? false;
  const currentLikes = current?.likesCount ?? 0;
  useEffect(() => {
    setLiked(currentLiked);
    setLikeCount(currentLikes);
    setMenuOpen(false);
    if (currentId && onSlideSeen) onSlideSeen(currentId);
  }, [currentId, currentLiked, currentLikes, onSlideSeen]);

  const toggleLike = () => {
    /* istanbul ignore next -- the heart only mounts when both exist */
    if (!current || !onToggleLike) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => (next ? c + 1 : c - 1));
    onToggleLike(current.id);
  };

  useEffect(() => {
    if (!status || !current) return undefined;
    const duration = isVideo ? VIDEO_CAP_MS : IMAGE_DURATION_MS;
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const ratio = Math.min(1, (Date.now() - startedAt) / duration);
      setProgress(ratio);
      if (ratio >= 1) advanceRef.current();
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [status, index, isVideo, current]);

  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setProgress(0);
    } else {
      // At the first slide, tapping back jumps to the previous author (bug 2).
      onPrev?.();
    }
  };

  return (
    <Modal visible={!!status} transparent animationType="fade" onRequestClose={onClose}>
      <ModalThemeScope>
        <YStack testID="status-viewer" flex={1} backgroundColor="rgba(0,0,0,0.94)">
          <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
            <XStack gap={4} paddingHorizontal={12} paddingTop={8}>
              {slides.map((slide, slideIndex) => {
                let fill = 0;
                if (slideIndex < index) fill = 1;
                else if (slideIndex === index) fill = progress;
                return (
                  <YStack
                    key={slide.id}
                    flex={1}
                    height={3}
                    borderRadius={999}
                    backgroundColor="rgba(255,255,255,0.3)"
                    overflow="hidden"
                  >
                    <YStack height={3} width={`${fill * 100}%`} backgroundColor="#ffffff" />
                  </YStack>
                );
              })}
            </XStack>
            <XStack alignItems="center" justifyContent="space-between" padding={16}>
              <YStack flex={1}>
                <Text color="#ffffff" fontSize={16} fontWeight="900" numberOfLines={1}>
                  {status?.name ?? ''}
                </Text>
                {status?.subLabel ? (
                  <Text
                    testID="status-sublabel"
                    color="rgba(255,255,255,0.75)"
                    fontSize={11.5}
                    fontWeight="700"
                    numberOfLines={1}
                  >
                    {status.subLabel}
                  </Text>
                ) : null}
                {remaining ? (
                  <Text
                    testID="status-remaining"
                    color="rgba(255,255,255,0.75)"
                    fontSize={11.5}
                    fontWeight="700"
                  >
                    {remaining}
                  </Text>
                ) : null}
              </YStack>
              {onDelete && current ? (
                <XStack
                  testID="status-viewer-kebab"
                  role="button"
                  aria-label="Story options"
                  onPress={() => setMenuOpen((open) => !open)}
                  width={36}
                  height={36}
                  marginRight={8}
                  alignItems="center"
                  justifyContent="center"
                  borderRadius={18}
                  backgroundColor="rgba(255,255,255,0.16)"
                >
                  <MaterialIcons name="more-vert" size={20} color="#ffffff" />
                </XStack>
              ) : null}
              <XStack
                testID="status-viewer-close"
                role="button"
                aria-label="Close status"
                onPress={onClose}
                width={36}
                height={36}
                alignItems="center"
                justifyContent="center"
                borderRadius={18}
                backgroundColor="rgba(255,255,255,0.16)"
              >
                <MaterialIcons name="close" size={20} color="#ffffff" />
              </XStack>
            </XStack>
            {onDelete && menuOpen && current ? (
              <YStack
                testID="status-viewer-menu"
                position="absolute"
                top={92}
                right={16}
                zIndex={20}
                backgroundColor="$surface"
                borderRadius={12}
                borderWidth={1}
                borderColor="$borderColor"
                overflow="hidden"
              >
                <XStack
                  testID="status-viewer-delete"
                  role="button"
                  aria-label="Delete story"
                  onPress={() => {
                    setMenuOpen(false);
                    onDelete(current.id);
                  }}
                  alignItems="center"
                  gap={8}
                  paddingHorizontal={16}
                  paddingVertical={12}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons name="delete-outline" size={18} color="#e0435a" />
                  <Text fontSize={14} fontWeight="800" color="#e0435a">
                    Delete
                  </Text>
                </XStack>
              </YStack>
            ) : null}
            <YStack
              flex={1}
              testID="status-swipe"
              onStartShouldSetResponder={() => true}
              onResponderGrant={(event) => {
                swipeStartX.current = event.nativeEvent.pageX;
              }}
              onResponderRelease={(event) => onSwipeRelease(event.nativeEvent.pageX)}
            >
              {isVideo && current?.imageUrl ? (
                <StatusVideo uri={current.imageUrl} onEnded={() => advanceRef.current()} />
              ) : null}
              {!isVideo && current?.imageUrl ? (
                <AppImage
                  testID="status-viewer-image"
                  source={{ uri: current.imageUrl }}
                  style={{ flex: 1, width: '100%' }}
                  resizeMode="cover"
                />
              ) : null}
              <XStack position="absolute" top={0} bottom={0} left={0} right={0}>
                <YStack testID="status-prev" width="30%" onPress={goPrev} />
                <YStack flex={1} testID="status-next" onPress={() => advanceRef.current()} />
              </XStack>
            </YStack>
            {current?.caption ? (
              <Text color="#ffffff" fontSize={14} textAlign="center" padding={16}>
                {current.caption}
              </Text>
            ) : null}
            {onToggleLike && current ? (
              <XStack paddingHorizontal={16} paddingTop={8} alignItems="center" gap={8}>
                <XStack
                  testID="status-like"
                  role="button"
                  aria-label={liked ? 'Unlike story' : 'Like story'}
                  onPress={toggleLike}
                  alignItems="center"
                  gap={6}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons
                    name={liked ? 'favorite' : 'favorite-border'}
                    size={26}
                    color={liked ? '#ff4f73' : '#ffffff'}
                  />
                  {likeCount > 0 ? (
                    <Text testID="status-like-count" fontSize={14} fontWeight="800" color="#ffffff">
                      {likeCount}
                    </Text>
                  ) : null}
                </XStack>
              </XStack>
            ) : null}
            {onViewers && current ? (
              <XStack paddingHorizontal={16} paddingTop={8}>
                <XStack
                  testID="status-viewers"
                  role="button"
                  aria-label="See who viewed this story"
                  onPress={() => onViewers(current.id)}
                  alignItems="center"
                  gap={6}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <MaterialIcons name="visibility" size={20} color="#ffffff" />
                  <Text fontSize={13} fontWeight="800" color="#ffffff">
                    Viewers
                  </Text>
                </XStack>
              </XStack>
            ) : null}
            {status?.target && onOpenTarget ? (
              <XStack paddingHorizontal={16} paddingBottom={12}>
                <XStack
                  testID="status-open-target"
                  role="button"
                  aria-label="Open details"
                  onPress={() => onOpenTarget(status.target as StoryTarget)}
                  flex={1}
                  height={46}
                  alignItems="center"
                  justifyContent="center"
                  gap={6}
                  borderRadius={999}
                  backgroundColor="$primary"
                  pressStyle={{ opacity: 0.85 }}
                >
                  <Text fontSize={14} fontWeight="900" color={onPrimary}>
                    Open details
                  </Text>
                  <MaterialIcons name="arrow-forward" size={16} color={onPrimary} />
                </XStack>
              </XStack>
            ) : null}
          </SafeAreaView>
        </YStack>
      </ModalThemeScope>
    </Modal>
  );
}
