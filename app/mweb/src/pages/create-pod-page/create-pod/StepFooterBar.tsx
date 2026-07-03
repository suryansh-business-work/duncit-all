import { Box, Button, Stack } from '@mui/material';
import { alpha } from '@mui/material/styles';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { APP_SHELL_MAX_WIDTH } from '../../../app/appLayout';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

/** Pinned Back / Next (or Create Pod) action bar. Fixed above the app's bottom
 * navigation via --duncit-bottom-nav-overlay-offset so the actions are never
 * hidden behind the bottom menu (the reason the buttons "disappeared"). */
export default function StepFooterBar({
  isFirst,
  isLast,
  busy,
  onBack,
  onNext,
  onSubmit,
}: Readonly<Props>) {
  let primaryLabel = 'Next';
  if (isLast) primaryLabel = busy ? 'Creating…' : 'Create Pod';
  return (
    <Box
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(var(--duncit-bottom-nav-overlay-offset, 88px) + 2px)',
        zIndex: (theme) => theme.zIndex.appBar + 1,
        px: { xs: 1.25, sm: 2 },
        pointerEvents: 'none',
      }}
    >
      <Box
        sx={{
          maxWidth: APP_SHELL_MAX_WIDTH,
          mx: 'auto',
          p: 1,
          borderRadius: 3,
          border: 1,
          borderColor: 'divider',
          bgcolor: (theme) =>
            alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.9 : 0.96),
          backdropFilter: 'blur(18px)',
          boxShadow: '0 16px 36px rgba(15,23,42,0.22)',
          pointerEvents: 'auto',
        }}
      >
        <Stack direction="row" spacing={1.25}>
          <Button
            variant="outlined"
            fullWidth
            disabled={isFirst || busy}
            onClick={onBack}
            startIcon={<ArrowBackIosNewIcon sx={{ fontSize: 14 }} />}
            sx={{ flex: 1, fontWeight: 800 }}
          >
            Back
          </Button>
          <Button
            variant="contained"
            fullWidth
            disabled={busy}
            onClick={isLast ? onSubmit : onNext}
            endIcon={isLast ? undefined : <ArrowForwardIosIcon sx={{ fontSize: 14 }} />}
            sx={{ flex: 2, fontWeight: 900 }}
          >
            {primaryLabel}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
