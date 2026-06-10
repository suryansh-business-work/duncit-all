import { useRef, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
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

const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit($fileBase64: String!, $fileName: String!, $mimeType: String, $folder: String) {
    uploadImageToImagekit(fileBase64: $fileBase64, fileName: $fileName, mimeType: $mimeType, folder: $folder) {
      url
    }
  }
`;

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  helperText?: string;
  error?: boolean;
  disabled?: boolean;
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read selected file'));
    reader.readAsDataURL(file);
  });

/**
 * Single-image control: paste a URL or upload a device file to ImageKit.
 * Stores the resulting URL as a plain string in the field.
 */
export default function ImageField({
  label,
  value,
  onChange,
  folder = '/website',
  helperText,
  error,
  disabled,
}: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadImage] = useMutation(UPLOAD_IMAGE);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setUploadError(`${file.name} is too large (max 15 MB)`);
      return;
    }
    setBusy(true);
    setUploadError(null);
    try {
      const fileBase64 = await readAsDataUrl(file);
      const res = await uploadImage({
        variables: { fileBase64, fileName: file.name, mimeType: file.type, folder },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (url) onChange(url);
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={1}>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
      <TextField
        label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        fullWidth
        disabled={disabled || busy}
        error={error || !!uploadError}
        helperText={uploadError || helperText}
        placeholder="Click the icon to upload, or paste a URL…"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Tooltip title="Upload from device">
                <span>
                  <IconButton
                    size="small"
                    onClick={() => inputRef.current?.click()}
                    disabled={disabled || busy}
                  >
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
