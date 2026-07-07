import { useEffect } from 'react';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { isVideoMedia, type ClubMedia } from './types';

interface Props {
  items: ClubMedia[];
  /** Active index, or null when the lightbox is closed. */
  index: number | null;
  onClose: () => void;
  onNavigate: (nextIndex: number) => void;
}

/** Full-screen media viewer with prev/next + keyboard navigation. Opened by a
 * gallery thumbnail; supports images and inline video playback. */
export default function MediaLightbox({ items, index, onNavigate, onClose }: Readonly<Props>) {
  const open = index !== null && index >= 0 && index < items.length;
  const canNavigate = items.length > 1;

  const goPrev = () => onNavigate(((index ?? 0) - 1 + items.length) % items.length);
  const goNext = () => onNavigate(((index ?? 0) + 1) % items.length);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && canNavigate) goPrev();
      if (e.key === 'ArrowRight' && canNavigate) goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, canNavigate, items.length]);

  if (!open) return null;
  const current = items[index];

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { bgcolor: 'common.black' } }}>
      <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: { xs: 320, md: 520 } }}>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, color: 'common.white', bgcolor: 'rgba(0,0,0,0.4)' }}
        >
          <CloseIcon />
        </IconButton>

        {canNavigate && (
          <IconButton
            onClick={goPrev}
            aria-label="Previous"
            sx={{ position: 'absolute', left: 8, zIndex: 2, color: 'common.white', bgcolor: 'rgba(0,0,0,0.4)' }}
          >
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
        )}

        {isVideoMedia(current) ? (
          <Box component="video" src={current.url} controls autoPlay sx={{ maxWidth: '100%', maxHeight: '80vh' }} />
        ) : (
          <Box
            component="img"
            src={current.url}
            alt={`Media ${index + 1}`}
            sx={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', display: 'block' }}
          />
        )}

        {canNavigate && (
          <IconButton
            onClick={goNext}
            aria-label="Next"
            sx={{ position: 'absolute', right: 8, zIndex: 2, color: 'common.white', bgcolor: 'rgba(0,0,0,0.4)' }}
          >
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        )}

        <Stack
          sx={{ position: 'absolute', bottom: 8, left: 0, right: 0, alignItems: 'center', zIndex: 2 }}
        >
          <Typography variant="caption" sx={{ color: 'common.white', bgcolor: 'rgba(0,0,0,0.5)', px: 1.25, py: 0.25, borderRadius: 1 }}>
            {index + 1} / {items.length}
          </Typography>
        </Stack>
      </Box>
    </Dialog>
  );
}
