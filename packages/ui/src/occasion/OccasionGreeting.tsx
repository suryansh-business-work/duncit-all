import { useEffect, useState } from 'react';
import { Box, Grow, IconButton, Typography } from '@mui/material';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { useTranslation } from '../i18n/useTranslation';

export interface OccasionGreetingProps {
  text: string;
  /** Skip the grow-in (the viewer asked for reduced motion). */
  instant?: boolean;
  onClose: () => void;
}

/** Long enough to read a short line twice, short enough not to linger over the page. */
const SHOW_MS = 6000;

/**
 * The look's festive line ("Merry Christmas from Duncit!"), grown in under the
 * header in the look's own colours, announced politely to screen readers and
 * gone by itself after a few seconds — or straight away with its close button.
 */
export function OccasionGreeting({ text, instant = false, onClose }: Readonly<OccasionGreetingProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => setOpen(false), SHOW_MS);
    return () => globalThis.clearTimeout(timer);
  }, []);

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 72px)',
        left: 0,
        right: 0,
        px: 2,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
        zIndex: (theme) => theme.zIndex.snackbar,
      }}
    >
      <Grow in={open} timeout={instant ? 0 : 450} onExited={onClose} style={{ transformOrigin: 'top center' }}>
        <Box
          data-testid="occasion-greeting"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            maxWidth: 480,
            py: 0.75,
            pl: 1.75,
            pr: 0.5,
            borderRadius: 999,
            pointerEvents: 'auto',
            color: 'primary.contrastText',
            background: (theme) => `linear-gradient(120deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            boxShadow: 6,
          }}
        >
          <CelebrationRoundedIcon fontSize="small" aria-hidden />
          <Typography variant="subtitle2" component="p" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
            {text}
          </Typography>
          <IconButton size="small" color="inherit" aria-label={t('ui.occasion.dismiss')} onClick={() => setOpen(false)}>
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Grow>
    </Box>
  );
}
