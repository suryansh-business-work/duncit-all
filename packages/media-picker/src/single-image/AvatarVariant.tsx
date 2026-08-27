import type { ReactNode } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { Alert, Avatar, Box, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { AvatarShape, SingleImageState } from './types';

interface Props extends SingleImageState {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  disabled?: boolean;
  shape: AvatarShape;
  uploadTestId?: string;
  /** The hidden <input type="file"> element rendered by the parent field. */
  fileInput: ReactNode;
}

/**
 * crm ImageUploadField chrome: avatar/square preview with Replace/Remove
 * buttons. There is deliberately NO URL paste — everything goes through
 * ImageKit. Errors render as a dismissible Alert.
 */
export default function AvatarVariant({
  label,
  value,
  onChange,
  helperText,
  disabled,
  shape,
  uploadTestId,
  busy,
  error,
  setError,
  openPicker,
  fileInput,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const remove = () => {
    onChange('');
    setError(null);
  };
  const idleLabel = value ? 'Replace' : 'Upload';

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} sx={{
        alignItems: "center"
      }}>
        {value ? (
          <Avatar
            src={value}
            variant={shape === 'circle' ? 'circular' : 'rounded'}
            sx={{
              width: 72,
              height: 72,
              bgcolor: 'action.hover',
              borderRadius: shape === 'circle' ? '50%' : 1,
            }}
          />
        ) : (
          <Box
            sx={(t) => ({
              width: 72,
              height: 72,
              borderRadius: shape === 'circle' ? '50%' : 1,
              border: `1px dashed ${t.palette.divider}`,
              display: 'grid',
              placeItems: 'center',
              color: 'text.secondary',
            })}
          >
            <Typography variant="caption">{t('media.picker.noImage')}</Typography>
          </Box>
        )}
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 700,
              letterSpacing: 0.3,
              textTransform: 'uppercase'
            }}>
            {label}
          </Typography>
          <Stack direction="row" spacing={1}>
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={busy ? <CircularProgress size={14} /> : <UploadIcon />}
              onClick={openPicker}
              disabled={disabled || busy}
              data-testid={uploadTestId}
            >
              {busy ? 'Uploading…' : idleLabel}
            </DuncitButton>
            {value && (
              <Tooltip title={t('media.picker.removeImage')}>
                <DuncitIconButton
                  size="small"
                  color="error"
                  onClick={remove}
                  disabled={disabled || busy}
                  aria-label={t('media.picker.removeImage')}
                >
                  <DeleteIcon fontSize="small" />
                </DuncitIconButton>
              </Tooltip>
            )}
          </Stack>
          {helperText && (
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {helperText}
            </Typography>
          )}
        </Stack>
      </Stack>
      {fileInput}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
