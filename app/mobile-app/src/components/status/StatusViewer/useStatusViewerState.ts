import { useEffect, useRef, useState } from 'react';

import { resolveSwipe } from '@/utils/swipe';

import type { StatusViewerProps } from './types';

// Each slide runs 15s (images and videos alike); a video that ends sooner
// advances immediately. The 15s ceiling keeps a long clip from holding the
// story open (Bugs 3 & 8).
const IMAGE_DURATION_MS = 15000;
const VIDEO_CAP_MS = 15000;
const TICK_MS = 100;

/* istanbul ignore next -- placeholder ref value, replaced on the first render */
const NOOP = () => undefined;

type StatusViewerStateArgs = Pick<
  StatusViewerProps,
  'status' | 'onClose' | 'onNext' | 'onPrev' | 'onSlideSeen' | 'onToggleLike'
> & { startIndex: number };

/** Slide index, progress timer, swipe and like state for the story viewer. */
export function useStatusViewerState({
  status,
  onClose,
  onNext,
  onPrev,
  onSlideSeen,
  onToggleLike,
  startIndex,
}: StatusViewerStateArgs) {
  const [index, setIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  // A story video plays with its sound; the speaker in the header turns it off.
  const [muted, setMuted] = useState(false);
  const slides = status?.slides ?? [];
  const current = slides[index];
  // A video slide is one that has a clip to play. A VIDEO row with no media is
  // not one: it falls through to the empty frame, which the timer below still
  // has to advance — nothing else would.
  const isVideo = current?.mediaType === 'VIDEO' && !!current?.imageUrl;

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

  // Open at the requested slide whenever a new story opens — an author rail
  // starts at 0, the club page opens the story that was tapped.
  useEffect(() => {
    setIndex(startIndex);
    setProgress(0);
  }, [status, startIndex]);

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

  return {
    index,
    progress,
    menuOpen,
    setMenuOpen,
    liked,
    likeCount,
    muted,
    setMuted,
    slides,
    current,
    isVideo,
    advanceRef,
    swipeStartX,
    onSwipeRelease,
    toggleLike,
    goPrev,
  };
}
