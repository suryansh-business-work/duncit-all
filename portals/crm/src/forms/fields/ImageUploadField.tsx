import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useController, useFormContext } from 'react-hook-form';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { UPLOAD_IMAGE } from '../../api/crm.gql';
import { fileToBase64 } from '../../utils/fileToBase64';
import { parseApiError } from '@duncit/utils';

interface Props {
  name: string;
  label?: string;
  helperText?: string;
  /** Image-kit folder used for organisation in the bucket. */
  folder?: string;
  /** Render as a circular avatar (host profile photo) vs. a square preview. */
  shape?: 'circle' | 'square';
}

/**
 * Upload-an-image field bound to react-hook-form. Stores the resulting ImageKit
 * URL. Uses the existing server `uploadImageToImagekit` mutation so credentials
 * never leave the API server. Preview is shown inline; remove restores the
 * empty state.
 */
export default function ImageUploadField({
  name,
  label = 'Image',
  helperText,
  folder = 'crm',
  shape = 'square',
}: Readonly<Props>) {
  const { control } = useFormContext();
  const { field } = useController({ control, name });
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload] = useMutation(UPLOAD_IMAGE);

  const onPick = () => inputRef.current?.click();
  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) {
      setError('Max 8MB. Compress and try again.');
      return;
    }
    setBusy(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await upload({
        variables: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type || 'image/png',
          folder,
        },
      });
      const url = res.data?.uploadImageToImagekit?.url ?? '';
      field.onChange(url);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = () => {
    field.onChange('');
    setError(null);
  };

  const idleLabel = field.value ? 'Replace' : 'Upload';

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={2} alignItems="center">
        {field.value ? (
          <Avatar
            src={field.value}
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
            <Typography variant="caption">No image</Typography>
          </Box>
        )}
        <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
            {label}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant="outlined"
              startIcon={busy ? <CircularProgress size={14} /> : <UploadIcon />}
              onClick={onPick}
              disabled={busy}
              data-testid={`upload-${name}`}
            >
              {busy ? 'Uploading…' : idleLabel}
            </Button>
            {field.value && (
              <Tooltip title="Remove image">
                <IconButton size="small" color="error" onClick={remove} disabled={busy} aria-label="remove image">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          {helperText && (
            <Typography variant="caption" color="text.secondary">
              {helperText}
            </Typography>
          )}
        </Stack>
      </Stack>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}
