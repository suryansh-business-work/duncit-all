import type { ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
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
        placeholder="Click the icon to upload, or paste a URL…"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Tooltip title="Upload from device">
                <span>
                  <IconButton size="small" onClick={openPicker} disabled={disabled || busy}>
                    {busy ? <CircularProgress size={18} /> : <ImageIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
            </InputAdornment>
          ),
          endAdornment: value ? (
            <InputAdornment position="end">
              <Tooltip title="Open">
                <IconButton size="small" onClick={() => window.open(value, '_blank')}>
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ) : null,
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
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
            {value}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
