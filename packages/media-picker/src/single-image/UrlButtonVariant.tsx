import type { ReactNode } from 'react';
import { Button, FormHelperText, Stack, TextField } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import type { SingleImageState } from './types';

interface Props extends SingleImageState {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  helperText?: string;
  externalError?: boolean;
  disabled?: boolean;
  buttonLabel: string;
  uploadTestId?: string;
  /** The hidden <input type="file"> element rendered by the parent field. */
  fileInput: ReactNode;
}

/**
 * finance AttachmentField chrome: URL text field with an Upload button beside
 * it. URL paste is allowed; errors render as helper text under the row.
 */
export default function UrlButtonVariant({
  label,
  value,
  onChange,
  helperText,
  externalError,
  disabled,
  busy,
  error,
  openPicker,
  buttonLabel,
  uploadTestId,
  fileInput,
}: Readonly<Props>) {
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          disabled={disabled}
          error={externalError}
        />
        <Button
          variant="outlined"
          startIcon={<UploadFileIcon />}
          onClick={openPicker}
          disabled={disabled || busy}
          data-testid={uploadTestId}
          sx={{ mt: 0.5, whiteSpace: 'nowrap' }}
        >
          {busy ? 'Uploading…' : buttonLabel}
        </Button>
      </Stack>
      {fileInput}
      {error && <FormHelperText error>{error}</FormHelperText>}
      {helperText && !error && <FormHelperText>{helperText}</FormHelperText>}
    </Stack>
  );
}
