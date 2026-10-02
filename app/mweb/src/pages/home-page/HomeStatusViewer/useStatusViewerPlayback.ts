import { useCallback, useEffect, useRef, useState } from 'react';
import { STATUS_DURATION_MS } from './helpers';
import type { HomeStatusViewerItem, HomeStatusViewerSlide } from './types';

interface PlaybackArgs {
  item: HomeStatusViewerItem | null;
  startIndex: number;
  onNext?: () => void;
  onClose: () => void;
  onRecordView?: (slideId: string) => void;
}

/** Slide index, progress timer, like seed, mute and report hold for the viewer. */
export function useStatusViewerPlayback({ item, startIndex, onNext, onClose, onRecordView }: PlaybackArgs) {
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(startIndex);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  // A story video plays with its sound. The browser may refuse that on the
  // first slide, in which case the clip reports back and the speaker below
  // switches to "muted" rather than lying about it.
  const [muted, setMuted] = useState(false);
  // The slide being reported; the story is held for as long as this is set.
  const [reporting, setReporting] = useState<string | null>(null);
  const frameRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const pointerStartX = useRef(0);
  // End of the last slide hands off to the next follower's story (bug 2).
  const goNextStory = onNext ?? onClose;
  const itemKey = item ? [item.label, item.mediaUrl, item.targetUrl].filter(Boolean).join('|') : '';
  const fallbackSlides: HomeStatusViewerSlide[] = item
    ? [{ mediaUrl: item.mediaUrl, mediaType: item.mediaType, subLabel: item.subLabel }]
    : [];
  const slides = item?.slides?.length ? item.slides : fallbackSlides;
  const current = slides[index] ?? slides[0];
  // A video slide is one that has a clip to play. A VIDEO row with no url is
  // not one: it falls through to the placeholder, which the timer below still
  // has to advance — nothing else would.
  const videoSrc = current?.mediaType === 'VIDEO' ? current.mediaUrl : null;
  const isVideo = !!videoSrc;
  // A press holds the story, and so does an open report dialog.
  const held = paused || reporting !== null;

  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setReporting(null);
    setIndex(startIndex);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [itemKey, startIndex]);

  useEffect(() => {
    setProgress(0);
    elapsedRef.current = 0;
    startedAtRef.current = null;
  }, [index]);

  // Seed the like control from the shown slide and record the view (Bugs 2 & 5).
  const currentId = current?.id;
  const currentLiked = current?.likedByMe ?? false;
  const currentLikeCount = current?.likeCount ?? 0;
  useEffect(() => {
    setLiked(currentLiked);
    setLikeCount(currentLikeCount);
    if (currentId && onRecordView) onRecordView(currentId);
  }, [currentId, currentLiked, currentLikeCount, onRecordView]);

  useEffect(() => {
    // Videos drive their own progress/advance from the <video> element below.
    if (!item || held || isVideo) return undefined;
    startedAtRef.current = performance.now() - elapsedRef.current;
    const tick = (now: number) => {
      const startedAt = startedAtRef.current ?? now;
      const elapsed = now - startedAt;
      elapsedRef.current = elapsed;
      const nextProgress = Math.min(1, elapsed / STATUS_DURATION_MS);
      setProgress(nextProgress);
      if (nextProgress >= 1) {
        if (index < slides.length - 1) setIndex((value) => value + 1);
        else goNextStory();
      }
      else frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [index, item, goNextStory, held, slides.length, isVideo]);

  // Stable, so flipping the speaker does not re-run the clip's play() effect
  // on every render of the viewer.
  const handleAutoplayBlocked = useCallback(() => setMuted(true), []);

  return {
    progress,
    setProgress,
    setPaused,
    index,
    setIndex,
    liked,
    setLiked,
    likeCount,
    setLikeCount,
    muted,
    setMuted,
    reporting,
    setReporting,
    pointerStartX,
    goNextStory,
    slides,
    current,
    videoSrc,
    isVideo,
    held,
    currentId,
    handleAutoplayBlocked,
  };
}
