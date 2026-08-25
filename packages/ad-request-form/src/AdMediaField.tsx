import { useState } from 'react';
import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { MediaPickerDialog } from '@duncit/media-picker';
import type { AdMediaType } from './ad-options';
import { useTranslation } from './i18n/useTranslation';

interface AdMediaFieldProps {
  adType: AdMediaType;
  value: string;
  onChange: (url: string) => void;
  error?: boolean;
  helperText?: string;
  /** Renders a red required asterisk after the field label. */
  required?: boolean;
}

const PREVIEW_SX = {
  display: 'block',
  width: '100%',
  maxHeight: 260,
  objectFit: 'contain',
  borderRadius: 1,
  bgcolor: 'action.hover',
} as const;

/**
 * Ad creative upload: opens the shared MediaPickerDialog (device upload to
 * ImageKit or Pexels) scoped to the selected ad type, with an inline preview.
 */
export default function AdMediaField({ adType, value, onChange, error, helperText, required }: Readonly<AdMediaFieldProps>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isVideo = adType === 'VIDEO';
  // Each wording is its own catalogue row rather than a noun slotted into a
  // sentence: a language that inflects the verb for the noun cannot be built
  // by concatenation.
  const uploadLabel = isVideo ? t('adRequest.media.uploadVideo') : t('adRequest.media.uploadImage');
  const replaceLabel = isVideo
    ? t('adRequest.media.replaceVideo')
    : t('adRequest.media.replaceImage');
  const chooseLabel = isVideo ? t('adRequest.media.chooseVideo') : t('adRequest.media.chooseImage');
  const defaultHint = isVideo ? t('adRequest.media.hintVideo') : t('adRequest.media.hintImage');

  const handlePicked = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  return (
    <Box>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 1
        }}>
        {t('adRequest.media.label')}
        {required ? <Box component="span" sx={{ color: 'error.main' }}> *</Box> : null}
      </Typography>
      <Stack
        direction="row"
        spacing={2}
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap"
        }}>
        <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => setOpen(true)}>
          {value ? replaceLabel : uploadLabel}
        </Button>
        {value && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              wordBreak: 'break-all'
            }}>
            {value}
          </Typography>
        )}
      </Stack>
      {value && (
        <Box sx={{ mt: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
          {isVideo ? (
            <Box component="video" src={value} controls sx={PREVIEW_SX} />
          ) : (
            <Box component="img" src={value} alt={t('adRequest.media.previewAlt')} sx={PREVIEW_SX} />
          )}
        </Box>
      )}
      <FormHelperText error={error}>{helperText ?? defaultHint}</FormHelperText>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={handlePicked}
        folder="/ads"
        title={chooseLabel}
        accept={isVideo ? 'video/*' : 'image/*'}
      />
    </Box>
  );
}
