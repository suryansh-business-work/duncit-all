import type { ReactNode } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Box, CircularProgress, InputAdornment, Stack, TextField, Tooltip, Typography } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { DuncitIconButton } from '@duncit/buttons';
import type { SingleImageState } from './types';

interface Props extends SingleImageState {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  externalError?: boolean;
  disabled?: boolean;
  /** The hidden <input type="file"> element rendered by the parent field. */
  fileInput: ReactNode;
}

/**
 * website-app ImageField chrome: paste a URL or upload a device file to
 * ImageKit, with an inline preview card under the text field.
 */
export default function UrlAdornmentVariant({
  label,
  value,
  onChange,
  helperText,
  externalError,
  disabled,
  busy,
  error,
  openPicker,
  fileInput,
}: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={1}>
      {fileInput}
      <TextField
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        disabled={disabled || busy}
        error={externalError || !!error}
        helperText={error || helperText}
        placeholder={t('media.picker.urlPlaceholder')}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Tooltip title={t('media.picker.fromDevice')}>
                  <span>
                    <DuncitIconButton size="small" onClick={openPicker} disabled={disabled || busy}>
                      {busy ? <CircularProgress size={18} /> : <ImageIcon fontSize="small" />}
                    </DuncitIconButton>
                  </span>
                </Tooltip>
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <Tooltip title={t('media.picker.open')}>
                  <DuncitIconButton size="small" onClick={() => window.open(value, '_blank')}>
                    <OpenInNewIcon fontSize="small" />
                  </DuncitIconButton>
                </Tooltip>
              </InputAdornment>
            ) : null,
          }
        }}
      />
      {value && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Box
            component="img"
            src={value}
            alt="preview"
            sx={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 1, bgcolor: 'action.hover' }}
          />
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              wordBreak: 'break-all'
            }}>
            {value}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
