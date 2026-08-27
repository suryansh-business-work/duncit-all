import { useEffect, useState } from 'react';
import { Alert, Box, LinearProgress, Link, Stack, Tooltip, Typography } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useTranslation } from '../i18n/useTranslation';
import type { RecordStage } from './useCallRecorder';

interface Props {
  stage: RecordStage;
  pct: number;
  url: string | null;
  error: string | null;
  /** Drops the finished mp4 into the conversation as an attachment. */
  onSendToChat: (url: string) => void;
  onDismiss: () => void;
}

/** Stage to key. Absent means the stage is not a 'still working' one. */
const BUSY_KEY: Partial<Record<RecordStage, string>> = {
  UPLOADING: 'shell.chat.recorder.uploading',
  CONVERTING: 'shell.chat.recorder.converting',
};

/** mm:ss — a recording is minutes long, never hours. */
const clock = (seconds: number) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
};

/** How long this take has been running. */
function useElapsed(running: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!running) {
      setSeconds(0);
      return;
    }
    const id = globalThis.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => globalThis.clearInterval(id);
  }, [running]);
  return seconds;
}

/**
 * What the recording is doing, under the call controls.
 *
 * Every stage after "stop" is shown with a real percentage rather than a
 * spinner, because the two slow ones are slow for different reasons — the
 * upload is the person's own connection, the conversion is our FFmpeg — and a
 * spinner that could mean either tells them nothing about whether to wait.
 */
export default function CallRecorder({
  stage,
  pct,
  url,
  error,
  onSendToChat,
  onDismiss,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const elapsed = useElapsed(stage === 'RECORDING');
  if (stage === 'IDLE') return null;

  if (stage === 'FAILED') {
    return (
      <Alert severity="error" onClose={onDismiss}>
        {error ?? t('shell.chat.recorder.failed')}
      </Alert>
    );
  }

  if (stage === 'RECORDING') {
    return (
      <Stack direction="row" spacing={1} sx={{
        alignItems: "center"
      }}>
        {/* The dot is the whole point: a recording that is not obviously
            running is a recording somebody did not know they were in. */}
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: 'error.main',
            animation: 'staffRecPulse 1.2s ease-in-out infinite',
            '@keyframes staffRecPulse': {
              '0%, 100%': { opacity: 1 },
              '50%': { opacity: 0.25 },
            },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        />
        <Typography variant="caption" role="status" sx={{
          color: "error.main"
        }}>
          {t('shell.chat.recorder.recording', { vars: { clock: clock(elapsed) } })}
        </Typography>
      </Stack>
    );
  }

  const busyKey = BUSY_KEY[stage];
  if (busyKey) {
    return (
      <Box>
        <Typography variant="caption" sx={{
          color: "text.secondary"
        }}>
          {t(busyKey)} {pct > 0 ? `${pct}%` : ''}
        </Typography>
        <LinearProgress
          variant={pct > 0 ? 'determinate' : 'indeterminate'}
          value={pct}
          sx={{ mt: 0.5, borderRadius: 1 }}
        />
      </Box>
    );
  }

  // READY.
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{
        alignItems: "center",
        flexWrap: "wrap"
      }}>
      <Typography variant="caption" sx={{
        color: "success.main"
      }}>
        {t('shell.chat.recorder.saved')}
      </Typography>
      <Box sx={{ flex: 1 }} />
      <DuncitButton
        size="small"
        component={Link}
        href={url ?? '#'}
        download="call-recording.mp4"
        target="_blank"
        rel="noreferrer"
        startIcon={<DownloadIcon />}
      >
        {t('shell.chat.recorder.download')}
      </DuncitButton>
      <DuncitButton
        size="small"
        variant="outlined"
        startIcon={<SendIcon />}
        onClick={() => url && onSendToChat(url)}
      >
        {t('shell.chat.recorder.sendToChat')}
      </DuncitButton>
      <Tooltip title={t('shell.chat.recorder.dismiss')}>
        <DuncitIconButton size="small" onClick={onDismiss} aria-label={t('shell.chat.recorder.dismissLabel')}>
          <CloseIcon fontSize="small" />
        </DuncitIconButton>
      </Tooltip>
    </Stack>
  );
}
