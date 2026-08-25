import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Box, Dialog, IconButton, Stack } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useTranslation } from '../../i18n/useTranslation';

export interface Moment {
  url: string;
  type?: string | null;
}

interface Props {
  moments: Moment[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (idx: number) => void;
  /**
   * Controls for the item on screen, drawn beside Close.
   *
   * The lightbox itself knows nothing about what it is showing — a club
   * story can be deleted and reported, a pod moment cannot — so the owner
   * of the list passes its own menu in rather than this file growing a
   * story-shaped branch.
   */
  actions?: ReactNode;
}

export default function MomentLightbox({
  moments,
  index,
  onClose,
  onIndexChange,
  actions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<number>(index ?? 0);
  const pushedHistory = useRef(false);
  const suppressNextPop = useRef(false);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  useEffect(() => {
    if (index === null || pushedHistory.current) return;
    globalThis.history.pushState({ ...globalThis.history.state, duncitLightbox: true }, '');
    pushedHistory.current = true;
  }, [index]);

  useEffect(() => {
    if (index === null) return;
    const onPop = () => {
      if (suppressNextPop.current) {
        suppressNextPop.current = false;
        return;
      }
      pushedHistory.current = false;
      onClose();
    };
    globalThis.addEventListener('popstate', onPop);
    return () => globalThis.removeEventListener('popstate', onPop);
  }, [index, onClose]);

  const close = () => {
    if (pushedHistory.current) {
      pushedHistory.current = false;
      suppressNextPop.current = true;
      onClose();
      globalThis.history.back();
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
    globalThis.addEventListener('keydown', onKey);
    return () => globalThis.removeEventListener('keydown', onKey);
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
      aria-label={t('mweb.moments.momentPreview')}
      slotProps={{
        paper: { sx: { bgcolor: 'rgba(0,0,0,0.94)' } }
      }}
    >
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ position: 'absolute', top: 12, right: 12, zIndex: 2 }}
        >
          {actions}
          <IconButton
            onClick={close}
            aria-label={t('mweb.moments.closePreview')}
            sx={{
              color: 'common.white',
              bgcolor: 'rgba(0,0,0,0.4)',
              minWidth: 44,
              minHeight: 44,
              '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
        {moments.length > 1 && (
          <>
            <IconButton
              onClick={prev}
              aria-label={t('mweb.moments.previousMoment')}
              sx={navBtn('left')}
            >
              <ChevronLeftIcon />
            </IconButton>
            <IconButton
              onClick={next}
              aria-label={t('mweb.moments.nextMoment')}
              sx={navBtn('right')}
            >
              <ChevronRightIcon />
            </IconButton>
          </>
        )}
        <Stack
          sx={{
            alignItems: "center",
            justifyContent: "center",
            width: '100%',
            height: '100%',
            p: 2
          }}>
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
