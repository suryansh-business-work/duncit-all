import { useState } from 'react';
import { Box, Button, FormHelperText, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { MediaPickerDialog } from '@duncit/media-picker';
import type { AdMediaType } from './ad-options';

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
  const [open, setOpen] = useState(false);
  const isVideo = adType === 'VIDEO';
  const mediaLabel = isVideo ? 'video' : 'image';
  const defaultHint = isVideo ? 'Upload the ad video (up to 100MB)' : 'Upload the ad image';

  const handlePicked = (url: string) => {
    onChange(url);
    setOpen(false);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Ad Media
        {required ? <Box component="span" sx={{ color: 'error.main' }}> *</Box> : null}
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Button variant="outlined" startIcon={<CloudUploadIcon />} onClick={() => setOpen(true)}>
          {value ? `Replace ${mediaLabel}` : `Upload ${mediaLabel}`}
        </Button>
        {value && (
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {value}
          </Typography>
        )}
      </Stack>
      {value && (
        <Box sx={{ mt: 1.5, border: 1, borderColor: 'divider', borderRadius: 1, p: 1 }}>
          {isVideo ? (
            <Box component="video" src={value} controls sx={PREVIEW_SX} />
          ) : (
            <Box component="img" src={value} alt="Ad media preview" sx={PREVIEW_SX} />
          )}
        </Box>
      )}
      <FormHelperText error={error}>{helperText ?? defaultHint}</FormHelperText>
      <MediaPickerDialog
        open={open}
        onClose={() => setOpen(false)}
        onPicked={handlePicked}
        folder="/ads"
        title={`Choose ad ${mediaLabel}`}
        accept={isVideo ? 'video/*' : 'image/*'}
      />
    </Box>
  );
}
