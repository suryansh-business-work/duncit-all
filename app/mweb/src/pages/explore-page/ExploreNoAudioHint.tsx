import { useEffect } from 'react';
import { Box } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from '../../i18n/useTranslation';

/** How long the pill stays up before it clears itself. */
const HINT_MS = 2000;

interface Props {
  open: boolean;
  onClose: () => void;
  podId: string;
}

/** "This video has no audio" — a pill centred over the reel after a tap on the
 * dimmed sound button. Native twin: ExploreNoAudioHint. */
export default function ExploreNoAudioHint({ open, onClose, podId }: Readonly<Props>) {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return undefined;
    const timer = globalThis.setTimeout(onClose, HINT_MS);
    return () => globalThis.clearTimeout(timer);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <Box
      data-testid={`reel-no-audio-${podId}`}
      role="status"
      sx={(theme) => ({
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        px: 2,
        py: 1,
        borderRadius: 999,
        bgcolor: alpha(theme.palette.common.black, 0.7),
        color: 'common.white',
        fontWeight: 600,
        fontSize: '0.875rem',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      })}
    >
      {t('mweb.explore.noAudio')}
    </Box>
  );
}
