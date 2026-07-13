import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import HomeStatusViewerDetails from './HomeStatusViewerDetails';

export interface HomeStatusViewerSlide {
  /** Post id — present for real stories so the slide can be recorded/liked/deleted. */
  id?: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  subLabel?: string;
  caption?: string;
  createdAt?: string;
  /** When the status auto-expires (drives the "X remaining" countdown). */
  expiresAt?: string | null;
  likeCount?: number;
  /** Has the viewer liked this story (Bug 5). */
  likedByMe?: boolean;
  commentCount?: number;
  thumbnailUrl?: string;
}

/** "X remaining" until the status auto-expires; null when unknown/expired.
 * Compact units (45m / 12h / 1d) — identical to the mobile app's label. */
export function statusRemainingLabel(expiresAt?: string | null, now: Date = new Date()): string | null {
  if (!expiresAt) return null;
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime()) || expiry.getTime() <= now.getTime()) return null;
  const minutes = Math.ceil((expiry.getTime() - now.getTime()) / 60000);
  if (minutes < 60) return `${minutes}m remaining`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
}

export interface HomeStatusViewerItem {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  slides?: HomeStatusViewerSlide[];
  targetUrl?: string;
  internal?: boolean;
  /** Origin of the story — gates like (user) vs viewers/delete (mine) (Bugs 4,5,7). */
  kind?: 'mine' | 'user' | 'club' | 'pod';
}

interface HomeStatusViewerProps {
  item: HomeStatusViewerItem | null;
  onClose: () => void;
  /** Jump to the next follower's story (end of slides / right tap / swipe left). */
  onNext?: () => void;
  /** Jump to the previous follower's story (back tap on slide 1 / swipe right). */
  onPrev?: () => void;
  /** Own story only — delete the currently shown slide by its post id (Bug 7). */
  onDelete?: (slideId: string) => void;
  /** Own story only — open the "seen by" viewers dialog for a slide (Bug 4). */
  onViewers?: (slideId: string) => void;
  /** Followers' stories only — like/unlike the current slide (Bug 5). */
  onToggleLike?: (slideId: string) => void;
  /** Record that a slide was shown so its ring greys (Bug 2). */
  onRecordView?: (slideId: string) => void;
}

// A horizontal pointer drag longer than this (px) counts as a story swipe.
const SWIPE_THRESHOLD = 48;

// Each slide runs 15s before auto-advancing; a video that ends sooner advances
// immediately, and the 15s ceiling keeps a long clip from holding it open
// (Bugs 3 & 8).
const STATUS_DURATION_MS = 15000;
const MAX_VIDEO_SECONDS = 15;

export default function HomeStatusViewer({
  item,
  onClose,
  onNext,
  onPrev,
  onDelete,
  onViewers,
  onToggleLike,
  onRecordView,
}: Readonly<HomeStatusViewerProps>) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
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
  const isVideo = current?.mediaType === 'VIDEO';

  useEffect(() => {
    setProgress(0);
    setPaused(false);
    setIndex(0);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [itemKey]);

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
    setMenuAnchor(null);
    if (currentId && onRecordView) onRecordView(currentId);
  }, [currentId, currentLiked, currentLikeCount, onRecordView]);

  useEffect(() => {
    // Videos drive their own progress/advance from the <video> element below.
    if (!item || paused || isVideo) return undefined;
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
  }, [index, item, goNextStory, paused, slides.length, isVideo]);

  if (!item) return null;

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
    else onPrev?.();
  };
  const goNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else goNextStory();
  };

  // Swipe left → next follower, swipe right → previous (bug 2).
  const handleSwipeEnd = (clientX: number) => {
    const dx = clientX - pointerStartX.current;
    if (dx <= -SWIPE_THRESHOLD) goNextStory();
    else if (dx >= SWIPE_THRESHOLD) onPrev?.();
  };

  const handleVideoTime = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const cap = Math.min(video.duration || MAX_VIDEO_SECONDS, MAX_VIDEO_SECONDS);
    if (cap > 0) setProgress(Math.min(1, video.currentTime / cap));
    if (video.currentTime >= cap) goNext();
  };

  const openTarget = () => {
    if (!item.targetUrl) return;
    onClose();
    if (item.internal) navigate(item.targetUrl);
    else window.open(item.targetUrl, '_blank', 'noreferrer');
  };

  const toggleLike = () => {
    if (!currentId || !onToggleLike) return;
    const next = !liked;
    setLiked(next);
    setLikeCount((value) => (next ? value + 1 : value - 1));
    onToggleLike(currentId);
  };

  const nextPeek = slides.slice(index + 1, index + 3);
  const agoLabel = current?.createdAt
    ? `${formatDistanceToNowStrict(new Date(current.createdAt))} ago`
    : null;
  // Countdown until the status is auto-removed (recomputed each slide tick).
  const remainingLabel = statusRemainingLabel(current?.expiresAt);
  const timeLabel = [agoLabel, remainingLabel].filter(Boolean).join(' · ') || null;
  const nonVideoMedia = current?.mediaUrl ? (
    <Box component="img" src={current.mediaUrl} alt={item.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
  ) : (
    <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #ff7a59 0%, #ed4f7a 45%, #15111c 100%)' }} />
  );

  return (
    <Dialog open={!!item} fullScreen onClose={onClose} PaperProps={{ sx: { bgcolor: '#08070b' } }}>
      <Box
        onPointerDown={(event) => {
          setPaused(true);
          pointerStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          setPaused(false);
          handleSwipeEnd(event.clientX);
        }}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        sx={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', color: '#fff', touchAction: 'none' }}
      >
        {current?.mediaType === 'VIDEO' ? (
          <Box
            key={`video-${index}`}
            component="video"
            src={current.mediaUrl ?? undefined}
            autoPlay
            muted
            playsInline
            onTimeUpdate={handleVideoTime}
            onEnded={goNext}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : current?.mediaUrl ? (
          <Box component="img" src={current.mediaUrl} alt={item.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #ff7a59 0%, #ed4f7a 45%, #15111c 100%)' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.52) 0%, transparent 30%, rgba(0,0,0,0.82) 100%)' }} />

        {/* Tap zones */}
        <Box onClick={goPrev} sx={{ position: 'absolute', top: 64, bottom: 120, left: 0, width: '30%', cursor: 'pointer', zIndex: 2 }} />
        <Box onClick={goNext} sx={{ position: 'absolute', top: 64, bottom: 120, right: 0, width: '40%', cursor: 'pointer', zIndex: 2 }} />
        <Stack spacing={1.2} sx={{ position: 'absolute', top: 12, left: 12, right: 12 }}>
          <Stack direction="row" spacing={0.5}>
            {slides.map((_, slideIndex) => (
              <Box key={slideIndex} sx={{ flex: 1, height: 3, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${(slideIndex < index ? 1 : slideIndex === index ? progress : 0) * 100}%`, borderRadius: 'inherit', bgcolor: '#fff' }} />
              </Box>
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              component={item.avatarUrl ? 'img' : 'div'}
              src={item.avatarUrl || undefined}
              sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', bgcolor: 'primary.main' }}
            />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }} noWrap>
                {item.label}
              </Typography>
              {(current?.subLabel || item.subLabel || timeLabel) && (
                <Typography variant="caption" sx={{ opacity: 0.78 }} noWrap>
                  {[current?.subLabel || item.subLabel, timeLabel].filter(Boolean).join(' · ')}
                </Typography>
              )}
            </Box>
            {onToggleLike && currentId && (
              <Stack direction="row" spacing={0.25} alignItems="center" sx={{ color: '#fff' }}>
                <IconButton
                  onClick={toggleLike}
                  aria-label={liked ? 'Unlike story' : 'Like story'}
                  data-testid="status-like"
                  sx={{ color: liked ? '#ff4f73' : '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}
                >
                  {liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
                {likeCount > 0 && (
                  <Typography variant="caption" sx={{ fontWeight: 900, minWidth: 12 }}>
                    {likeCount}
                  </Typography>
                )}
              </Stack>
            )}
            {onViewers && currentId && (
              <IconButton
                onClick={() => onViewers(currentId)}
                aria-label="See who viewed this story"
                data-testid="status-viewers"
                sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}
              >
                <VisibilityIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && currentId && (
              <IconButton
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                aria-label="Story options"
                data-testid="status-kebab"
                sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            )}
            {onDelete && currentId && (
              <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
                <MenuItem
                  data-testid="status-delete"
                  onClick={() => {
                    setMenuAnchor(null);
                    onDelete(currentId);
                  }}
                  sx={{ color: 'error.main', fontWeight: 700 }}
                >
                  <DeleteOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                  Delete
                </MenuItem>
              </Menu>
            )}
            <IconButton onClick={onClose} aria-label="Close status" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Bottom details + peek */}
        <HomeStatusViewerDetails
          current={current}
          timeLabel={timeLabel}
          nextPeek={nextPeek}
          index={index}
          onJumpTo={(i) => setIndex(i)}
          hasOpenButton={!!item.targetUrl}
        />
        {item.targetUrl && (
          <Button
            variant="contained"
            endIcon={<ArrowForwardIcon />}
            onClick={openTarget}
            sx={{ position: 'absolute', left: 12, right: 12, bottom: 'calc(18px + env(safe-area-inset-bottom))', borderRadius: 999, fontWeight: 900 }}
          >
            Open details
          </Button>
        )}
      </Box>
    </Dialog>
  );
}