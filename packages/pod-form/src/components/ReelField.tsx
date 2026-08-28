import { Box, Stack, TextField, Typography } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton } from '@duncit/buttons';
import { splitAroundAction, useTranslation } from '../i18n/useTranslation';

interface Props {
  /** Reel video URL ('' = no reel). */
  value: string;
  onChange: (next: string) => void;
  error?: string;
  /** When provided, a video picker is used; otherwise a plain URL input. */
  onPickVideo?: () => Promise<string | null>;
}

function ReelBody({ value, onChange, error, onPickVideo }: Readonly<Props>) {
  const { t } = useTranslation();
  const [emptyBefore, emptyAfter] = splitAroundAction(t('podForm.reelField.empty'));
  if (value) {
    return (
      <Stack spacing={1}>
        <Box
          component="video"
          src={value}
          controls
          sx={{ width: '100%', maxHeight: 260, borderRadius: 1, bgcolor: 'common.black' }}
        />
        <DuncitButton
          size="small"
          color="error"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => onChange('')}
          sx={{ alignSelf: 'flex-start' }}
        >
          {t('podForm.reelField.removeReel')}
        </DuncitButton>
      </Stack>
    );
  }
  if (onPickVideo) {
    return (
      <Box
        sx={{ border: 1, borderStyle: 'dashed', borderColor: 'divider', borderRadius: 1, p: 3, textAlign: 'center', color: 'text.secondary' }}
      >
        <VideocamIcon sx={{ opacity: 0.5 }} />
        <Typography variant="caption" sx={{ display: 'block' }}>
          {emptyBefore}
          <b>{t('podForm.reelField.pickVideo')}</b>
          {emptyAfter}
        </Typography>
      </Box>
    );
  }
  return (
    <TextField
      label={t('podForm.reelField.reelVideoUrl')}
      fullWidth
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={!!error}
      helperText={error}
    />
  );
}

/**
 * Optional Explore reel video for the pod. With `onPickVideo` it renders a
 * pick-video button + inline preview; without it, a URL text field.
 */
export default function ReelField({ value, onChange, error, onPickVideo }: Readonly<Props>) {
  const { t } = useTranslation();
  const pick = () => {
    onPickVideo?.()
      .then((url) => {
        if (url) onChange(url);
      })
      .catch(() => undefined);
  };

  return (
    <Box>
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1
        }}>
        <Typography variant="subtitle2">{t('podForm.reelField.podReel')}</Typography>
        {onPickVideo && (
          <DuncitButton size="small" startIcon={<VideocamIcon />} onClick={pick}>
            {value ? t('podForm.reelField.replaceVideo') : t('podForm.reelField.pickVideo')}
          </DuncitButton>
        )}
      </Stack>
      <Typography variant="caption" color={error ? 'error' : 'text.secondary'} sx={{ display: 'block', mb: 1 }}>
        {error || t('podForm.reelField.helper')}
      </Typography>
      <ReelBody value={value} onChange={onChange} error={error} onPickVideo={onPickVideo} />
    </Box>
  );
}
