import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Box, FormHelperText, LinearProgress, Stack, Typography } from '@mui/material';
import VideoFileIcon from '@mui/icons-material/VideoFileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { MB, useImagekitDirectUpload } from '@duncit/media-picker';
import { logs } from '@duncit/logs';
import { useTranslation } from '@duncit/shell';

const log = logs.portal['website-app'];

interface Props {
  value: string;
  sizeBytes: number;
  /** The Reel Slider Settings cap — checked here, before any byte is sent. */
  maxMb: number;
  error?: string;
  onUploaded: (url: string, sizeBytes: number) => void;
}

const toMb = (bytes: number) => (bytes / MB).toFixed(1);

/** Pick a reel, refuse it in the browser when it is over the cap, otherwise
 * stream it to ImageKit with a real byte-progress bar. */
export default function ReelVideoField({ value, sizeBytes, maxMb, error, onUploaded }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const helperId = useId();
  const { upload, uploading } = useImagekitDirectUpload();
  const [progress, setProgress] = useState(0);
  const [problem, setProblem] = useState<string | null>(null);

  const onPick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      setProblem(t('websiteApp.reels.notVideo'));
      return;
    }
    if (file.size > maxMb * MB) {
      setProblem(t('websiteApp.reels.tooLarge', { vars: { size: toMb(file.size), max: maxMb } }));
      return;
    }
    setProblem(null);
    setProgress(0);
    try {
      const url = await upload(file, '/website/reels', setProgress);
      onUploaded(url, file.size);
    } catch (err) {
      log.error('ReelSlider', 'ReelVideoField', { error: err, msg: 'reel upload failed' });
      setProblem(t('websiteApp.reels.uploadFailed'));
    }
  };

  const message = problem ?? error;
  const hint = value
    ? t('websiteApp.reels.uploaded', { vars: { size: toMb(sizeBytes) } })
    : t('websiteApp.reels.sizeHint', { vars: { max: maxMb } });

  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" component="span">
        {t('websiteApp.reels.fieldVideo')}
      </Typography>
      {value && (
        <Box
          component="video"
          src={value}
          muted
          loop
          playsInline
          controls
          preload="metadata"
          sx={{ width: 140, aspectRatio: '9 / 16', borderRadius: 1, bgcolor: 'grey.900', objectFit: 'cover' }}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          onPick(event).catch((error) => log.error('ReelSlider', 'ReelVideoField', { error, msg: 'reel pick failed' }));
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
          {value ? t('websiteApp.reels.replace') : t('websiteApp.reels.choose')}
        </DuncitButton>
      </Box>
      {uploading && (
        <Stack spacing={0.5}>
          <LinearProgress variant="determinate" value={progress} aria-label={t('websiteApp.reels.fieldVideo')} />
          <Typography variant="caption" role="status">
            {t('websiteApp.reels.uploading', { vars: { pct: progress } })}
          </Typography>
        </Stack>
      )}
      <FormHelperText id={helperId} error={!!message} role={message ? 'alert' : undefined}>
        {message ?? hint}
      </FormHelperText>
    </Stack>
  );
}
