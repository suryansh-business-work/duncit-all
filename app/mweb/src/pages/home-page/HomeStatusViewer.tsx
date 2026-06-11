import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';
import HomeStatusViewerDetails from './HomeStatusViewerDetails';

export interface HomeStatusViewerSlide {
  mediaUrl?: string | null;
  mediaType?: string | null;
  subLabel?: string;
  caption?: string;
  createdAt?: string;
  likeCount?: number;
  commentCount?: number;
  thumbnailUrl?: string;
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
}

interface HomeStatusViewerProps {
  item: HomeStatusViewerItem | null;
  onClose: () => void;
}

// Each image slide runs 15s before auto-advancing; videos play to their end
// (capped so a long clip can't hold the story open indefinitely).
const STATUS_DURATION_MS = 15000;
const MAX_VIDEO_SECONDS = 30;

export default function HomeStatusViewer({ item, onClose }: Readonly<HomeStatusViewerProps>) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [index, setIndex] = useState(0);
  const frameRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const itemKey = item ? [item.label, item.mediaUrl, item.targetUrl].filter(Boolean).join('|') : '';
  const slides = item?.slides?.length ? item.slides : item ? [{ mediaUrl: item.mediaUrl, mediaType: item.mediaType, subLabel: item.subLabel }] : [];
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
        else onClose();
      }
      else frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [index, item, onClose, paused, slides.length, isVideo]);

  if (!item) return null;

  const goPrev = () => {
    if (index > 0) setIndex(index - 1);
  };
  const goNext = () => {
    if (index < slides.length - 1) setIndex(index + 1);
    else onClose();
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

  const nextPeek = slides.slice(index + 1, index + 3);
  const timeLabel = current?.createdAt
    ? `${formatDistanceToNowStrict(new Date(current.createdAt))} ago`
    : null;

  return (
    <Dialog open={!!item} fullScreen onClose={onClose} PaperProps={{ sx: { bgcolor: '#08070b' } }}>
      <Box
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
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