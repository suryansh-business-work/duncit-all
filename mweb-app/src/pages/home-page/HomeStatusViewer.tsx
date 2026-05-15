import { useEffect, useRef, useState } from 'react';
import { Box, Button, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useNavigate } from 'react-router-dom';

export interface HomeStatusViewerItem {
  label: string;
  subLabel?: string;
  avatarUrl?: string | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  targetUrl?: string;
  internal?: boolean;
}

interface HomeStatusViewerProps {
  item: HomeStatusViewerItem | null;
  onClose: () => void;
}

const STATUS_DURATION_MS = 6500;

export default function HomeStatusViewer({ item, onClose }: HomeStatusViewerProps) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const frameRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const startedAtRef = useRef<number | null>(null);
  const itemKey = item ? [item.label, item.mediaUrl, item.targetUrl].filter(Boolean).join('|') : '';

  useEffect(() => {
    setProgress(0);
    setPaused(false);
    elapsedRef.current = 0;
    startedAtRef.current = null;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
  }, [itemKey]);

  useEffect(() => {
    if (!item || paused) return undefined;
    startedAtRef.current = performance.now() - elapsedRef.current;
    const tick = (now: number) => {
      const startedAt = startedAtRef.current ?? now;
      const elapsed = now - startedAt;
      elapsedRef.current = elapsed;
      const nextProgress = Math.min(1, elapsed / STATUS_DURATION_MS);
      setProgress(nextProgress);
      if (nextProgress >= 1) onClose();
      else frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [item, onClose, paused]);

  if (!item) return null;

  const openTarget = () => {
    if (!item.targetUrl) return;
    onClose();
    if (item.internal) navigate(item.targetUrl);
    else window.open(item.targetUrl, '_blank', 'noreferrer');
  };

  return (
    <Dialog open={!!item} fullScreen onClose={onClose} PaperProps={{ sx: { bgcolor: '#08070b' } }}>
      <Box
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        sx={{ position: 'relative', width: '100%', height: '100dvh', overflow: 'hidden', color: '#fff', touchAction: 'none' }}
      >
        {item.mediaType === 'VIDEO' ? (
          <Box component="video" src={item.mediaUrl ?? undefined} autoPlay muted loop playsInline sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : item.mediaUrl ? (
          <Box component="img" src={item.mediaUrl} alt={item.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #ff7a59 0%, #ed4f7a 45%, #15111c 100%)' }} />
        )}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.52) 0%, transparent 30%, rgba(0,0,0,0.82) 100%)' }} />
        <Stack spacing={1.2} sx={{ position: 'absolute', top: 12, left: 12, right: 12 }}>
          <Box sx={{ height: 3, borderRadius: 999, bgcolor: 'rgba(255,255,255,0.28)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${progress * 100}%`, borderRadius: 'inherit', bgcolor: '#fff' }} />
          </Box>
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
              {item.subLabel && <Typography variant="caption" sx={{ opacity: 0.78 }} noWrap>{item.subLabel}</Typography>}
            </Box>
            <IconButton onClick={onClose} aria-label="Close status" sx={{ color: '#fff', bgcolor: 'rgba(0,0,0,0.34)' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
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