import { useEffect, useRef, useState } from 'react';
import { Box, Dialog, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

export interface Moment {
  url: string;
  type?: string | null;
}

interface Props {
  moments: Moment[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
}

export default function MomentLightbox({ moments, index, onClose, onIndexChange }: Props) {
  const [current, setCurrent] = useState<number>(index ?? 0);
  const pushedHistory = useRef(false);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  useEffect(() => {
    if (index === null || pushedHistory.current) return;
    window.history.pushState({ ...(window.history.state || {}), duncitLightbox: true }, '');
    pushedHistory.current = true;
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onPop = () => {
      pushedHistory.current = false;
      onClose();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [index, onClose]);

  const close = () => {
    if (pushedHistory.current) {
      window.history.back();
      return;
    }
    onClose();
  };

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, moments.length]);

  if (index === null || moments.length === 0) return null;
  const moment = moments[current];

  const next = () => {
    const n = (current + 1) % moments.length;
    setCurrent(n);
    onIndexChange(n);
  };
  const prev = () => {
    const n = (current - 1 + moments.length) % moments.length;
    setCurrent(n);
    onIndexChange(n);
  };

  return (
    <Dialog
      open={index !== null}
      onClose={close}
      fullScreen
      PaperProps={{ sx: { bgcolor: 'rgba(0,0,0,0.94)' } }}
      aria-label="Moment preview"
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <IconButton
          onClick={close}
          aria-label="Close preview"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            color: 'common.white',
            bgcolor: 'rgba(0,0,0,0.4)',
            zIndex: 2,
            minWidth: 44,
            minHeight: 44,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
          }}
        >
          <CloseIcon />
        </IconButton>
        {moments.length > 1 && (
          <>
            <IconButton
              onClick={prev}
              aria-label="Previous moment"
              sx={navBtn('left')}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={next}
              aria-label="Next moment"
              sx={navBtn('right')}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
        <Stack
          alignItems="center"
          justifyContent="center"
          sx={{ width: '100%', height: '100%', p: 2 }}
        >
          {moment.type === 'VIDEO' ? (
            <Box
              component="video"
              src={moment.url}
              controls
              autoPlay
              sx={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 1 }}
            />
          ) : (
            <Box
              component="img"
              src={moment.url}
              alt={`Moment ${current + 1} of ${moments.length}`}
              sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 1 }}
            />
          )}
        </Stack>
        {moments.length > 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 0,
              right: 0,
              textAlign: 'center',
              color: 'common.white',
              fontSize: 13,
              opacity: 0.85,
            }}
          >
            {current + 1} / {moments.length}
          </Box>
        )}
      </Box>
    </Dialog>
  );
}

const navBtn = (side: 'left' | 'right') => ({
  position: 'absolute' as const,
  top: '50%',
  [side]: 12,
  transform: 'translateY(-50%)',
  color: 'common.white',
  bgcolor: 'rgba(0,0,0,0.4)',
  zIndex: 2,
  minWidth: 44,
  minHeight: 44,
  '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
});
