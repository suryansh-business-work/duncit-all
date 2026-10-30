import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Box, FormHelperText, LinearProgress, Stack, Typography } from '@mui/material';
import VideoFileIcon from '@mui/icons-material/VideoFileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { MB, useImagekitDirectUpload, useUploadCaps } from '@duncit/media-picker';
import { logs } from '@duncit/logs';
import { formatTutorialDuration } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

const log = logs.portal.support;

interface Props {
  value: string;
  durationSec: number;
  error?: string;
  onUploaded: (url: string) => void;
  /** The length the browser read off the video, in whole seconds. */
  onDuration: (seconds: number) => void;
}

const toMb = (bytes: number) => (bytes / MB).toFixed(1);

/** Pick a tutorial video, refuse it in the browser when it is over the admin's
 * cap, otherwise stream it to ImageKit with a real byte-progress bar. The
 * preview's metadata fills the tutorial's length. */
export default function TutorialVideoField({ value, durationSec, error, onUploaded, onDuration }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const helperId = useId();
  const { maxVideoBytes } = useUploadCaps('PORTALS');
  const { upload, uploading } = useImagekitDirectUpload();
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setProblem(t('support.tutorials.notVideo'));
      return;
    }
    if (file.size > maxVideoBytes) {
      setProblem(
        t('support.tutorials.videoTooLarge', { vars: { size: toMb(file.size), max: toMb(maxVideoBytes) } }),
      );
      return;
    }
    setProblem(null);
    setProgress(0);
    try {
      onUploaded(await upload(file, '/support/tutorials', setProgress));
    } catch (err) {
      log.error('Tutorials', 'TutorialVideoField', { error: err, msg: 'tutorial video upload failed' });
      setProblem(t('support.tutorials.uploadFailed'));
    }
  };

  const message = problem ?? error;
  const hint = value && durationSec > 0
    ? t('support.tutorials.uploadedDuration', { vars: { duration: formatTutorialDuration(durationSec) } })
    : t('support.tutorials.videoHint');

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="span">
        {t('support.tutorials.fieldVideo')}
      </Typography>
      {value && (
        <Box
          component="video"
          src={value}
          muted
          playsInline
          controls
          preload="metadata"
          aria-label={t('support.tutorials.fieldVideo')}
          onLoadedMetadata={(event) => {
            const seconds = Math.round(event.currentTarget.duration);
            if (Number.isFinite(seconds) && seconds > 0) onDuration(seconds);
          }}
          sx={{ width: 140, aspectRatio: '9 / 16', borderRadius: 1, bgcolor: 'grey.900', objectFit: 'cover' }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          onPick(event).catch((cause) => log.error('Tutorials', 'TutorialVideoField', { error: cause, msg: 'pick failed' }));
        }}
      />
      <Box>
        <DuncitButton
          variant="outlined"
          startIcon={<VideoFileIcon />}
          disabled={uploading}
          aria-describedby={helperId}
          onClick={() => inputRef.current?.click()}
        >
          {value ? t('support.tutorials.replaceVideo') : t('support.tutorials.chooseVideo')}
        </DuncitButton>
      </Box>
      {uploading && (
        <Stack spacing={0.5}>
          <LinearProgress variant="determinate" value={progress} aria-label={t('support.tutorials.fieldVideo')} />
          <Typography variant="caption" role="status">
            {t('support.tutorials.uploading', { vars: { pct: progress } })}
          </Typography>
        </Stack>
      )}
      <FormHelperText id={helperId} error={!!message} role={message ? 'alert' : undefined}>
        {message ?? hint}
      </FormHelperText>
    </Stack>
  );
}
