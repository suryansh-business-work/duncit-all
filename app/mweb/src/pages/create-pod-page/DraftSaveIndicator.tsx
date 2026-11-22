import { Box, CircularProgress, Fade } from '@mui/material';
import CloudDoneOutlinedIcon from '@mui/icons-material/CloudDoneOutlined';
import CloudOffOutlinedIcon from '@mui/icons-material/CloudOffOutlined';
import type { DraftSaveStatus } from '@duncit/utils';
import { useTranslation } from '../../i18n/useTranslation';

const LABEL_KEYS = {
  saving: 'mweb.createPod.autosave.saving',
  saved: 'mweb.createPod.autosave.saved',
  error: 'mweb.createPod.autosave.error',
} as const;

const ICONS = {
  saving: <CircularProgress size="1em" color="inherit" aria-hidden />,
  saved: <CloudDoneOutlinedIcon fontSize="inherit" aria-hidden />,
  error: <CloudOffOutlinedIcon fontSize="inherit" aria-hidden />,
} as const;

/**
 * The draft's save state in the header corner: Saving, Saved, or that it
 * could not save (it retries by itself). Caption-sized and muted, it fades
 * between states and never takes focus or blocks a tap; a screen reader hears
 * each change politely. Native twin: components/create-pod/DraftSaveIndicator.
 */
export default function DraftSaveIndicator({ status }: Readonly<{ status: DraftSaveStatus }>) {
  const { t } = useTranslation();
  return (
    <Box
      role="status"
      aria-live="polite"
      data-testid="draft-save-indicator"
      data-status={status}
      sx={{ display: 'flex', alignItems: 'center', minWidth: 0, pointerEvents: 'none' }}
    >
      {status === 'idle' ? null : (
        <Fade in key={status} appear>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              typography: 'caption',
              whiteSpace: 'nowrap',
              color: status === 'error' ? 'error.main' : 'text.secondary',
            }}
          >
            {ICONS[status]}
            {t(LABEL_KEYS[status])}
          </Box>
        </Fade>
      )}
    </Box>
  );
}
