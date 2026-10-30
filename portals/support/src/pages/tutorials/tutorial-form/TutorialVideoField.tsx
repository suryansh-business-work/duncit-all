import { useId, useState } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';
import VideoFileIcon from '@mui/icons-material/VideoFileOutlined';
import { DuncitButton } from '@duncit/buttons';
import { MediaPickerDialog } from '@duncit/media-picker';
import { formatTutorialDuration } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  value: string;
  durationSec: number;
  error?: string;
  onUploaded: (url: string) => void;
  /** The length the browser read off the video, in whole seconds. */
  onDuration: (seconds: number) => void;
}

/** Pick a tutorial video through the shared upload dialog, which applies the
 * admin's video cap and streams the file to ImageKit with byte progress. The
 * preview's metadata fills the tutorial's length. Device only: a how-to is a
 * recording of the app, never a stock clip. */
export default function TutorialVideoField({ value, durationSec, error, onUploaded, onDuration }: Readonly<Props>) {
  const { t } = useTranslation();
  const helperId = useId();
  const [open, setOpen] = useState(false);

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
      <Box>
        <DuncitButton
          variant="outlined"
          startIcon={<VideoFileIcon />}
          aria-describedby={helperId}
          onClick={() => setOpen(true)}
        >
          {value ? t('support.tutorials.replaceVideo') : t('support.tutorials.chooseVideo')}
        </DuncitButton>
      </Box>
      <FormHelperText id={helperId} error={!!error} role={error ? 'alert' : undefined}>
        {error ?? hint}
      </FormHelperText>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={(url) => {
          onUploaded(url);
          setOpen(false);
        }}
        accept="video/*"
        deviceOnly
        folder="/support/tutorials"
        title={t('support.tutorials.fieldVideo')}
      />
    </Stack>
  );
}
