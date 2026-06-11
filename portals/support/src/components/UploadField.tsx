import { useRef, useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';

const UPLOAD_IMAGE = gql`
  mutation UploadImageToImagekit($fileBase64: String!, $fileName: String!, $mimeType: String, $folder: String) {
    uploadImageToImagekit(fileBase64: $fileBase64, fileName: $fileName, mimeType: $mimeType, folder: $folder) {
      url
    }
  }
`;

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  folder?: string;
  max?: number;
  label?: string;
  disabled?: boolean;
}

/**
 * Shared device-file upload control used across the Support portal (tickets,
 * live chat). Reads files as data URLs and uploads them to ImageKit via the
 * server `uploadImageToImagekit` mutation, returning a list of URLs.
 */
export default function UploadField({
  value,
  onChange,
  folder = '/support',
  max = 5,
  label = 'Attach files',
  disabled = false,
}: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadImage] = useMutation(UPLOAD_IMAGE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      /* v8 ignore next -- FileReader always yields a data URL for the files we accept */
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Could not read selected file'));
      reader.readAsDataURL(file);
    });

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    /* v8 ignore next -- the change event always carries a FileList */
    const files = Array.from(e.target.files || []);
    if (inputRef.current) inputRef.current.value = '';
    if (!files.length) return;
    const room = Math.max(0, max - value.length);
    const slice = files.slice(0, room);
    setBusy(true);
    setError(null);
    try {
      const urls: string[] = [];
      for (const f of slice) {
        if (f.size > 15 * 1024 * 1024) {
          setError(`${f.name} is too large (max 15 MB)`);
          continue;
        }
        const fileBase64 = await readAsDataUrl(f);
        const res = await uploadImage({
          variables: { fileBase64, fileName: f.name, mimeType: f.type, folder },
        });
        const url = res.data?.uploadImageToImagekit?.url;
        if (url) urls.push(url);
      }
      if (urls.length) onChange([...value, ...urls].slice(0, max));
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: value.length ? 1 : 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          {label} ({value.length}/{max})
        </Typography>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={onPick}
        />
        <Button
          size="small"
          startIcon={busy ? <CircularProgress size={14} /> : <AttachFileIcon />}
          disabled={disabled || busy || value.length >= max}
          onClick={() => inputRef.current?.click()}
        >
          Add
        </Button>
      </Stack>
      {value.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
          {value.map((url, i) => (
            <Box key={url + i} sx={{ position: 'relative', width: 64, height: 64 }}>
              <Avatar variant="rounded" src={url} sx={{ width: 64, height: 64, '& img': { objectFit: 'cover' } }} />
              <IconButton
                size="small"
                aria-label="Remove attachment"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                sx={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  width: 22,
                  height: 22,
                }}
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}
      {error && (
        <Typography variant="caption" color="error">
          {error}
        </Typography>
      )}
    </Box>
  );
}
