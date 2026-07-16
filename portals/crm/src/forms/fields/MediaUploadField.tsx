import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import { useController, useFormContext } from 'react-hook-form';
import { Alert, Box, Button, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteIcon from '@mui/icons-material/Delete';
import { UPLOAD_IMAGE } from '../../api/crm.gql';
import { fileToBase64 } from '../../utils/fileToBase64';
import { parseApiError } from '@duncit/utils';

interface Props {
  name: string;
  label: string;
  kind: 'image' | 'video';
  folder?: string;
  helperText?: string;
}

/** Newline-joined URL string <-> array helpers (storage stays the same). */
const toList = (value: string): string[] => (value || '').split('\n').map((u) => u.trim()).filter(Boolean);
const toValue = (list: string[]): string => list.join('\n');

/**
 * Multi-file uploader bound to a newline-joined URL string. Every file is
 * pushed to ImageKit via the server `uploadImageToImagekit` mutation — there is
 * NO raw URL paste. Used for venue/host photos and videos.
 */
export default function MediaUploadField({ name, label, kind, folder = 'crm/media', helperText }: Readonly<Props>) {
  const { control } = useFormContext();
  const { field } = useController({ control, name });
  const list = toList((field.value as string) ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload] = useMutation(UPLOAD_IMAGE);

  const maxBytes = kind === 'video' ? 100 * 1024 * 1024 : 8 * 1024 * 1024;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (file.size > maxBytes) {
          setError(`${file.name} exceeds the ${kind === 'video' ? '100MB' : '8MB'} limit and was skipped.`);
          continue;
        }
        const fileBase64 = await fileToBase64(file);
        const res = await upload({
          variables: { fileBase64, fileName: file.name, mimeType: file.type || (kind === 'video' ? 'video/mp4' : 'image/png'), folder },
        });
        const url = res.data?.uploadImageToImagekit?.url ?? '';
        if (url) added.push(url);
      }
      if (added.length) field.onChange(toValue([...list, ...added]));
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (idx: number) => field.onChange(toValue(list.filter((_, i) => i !== idx)));

  const addLabel = kind === 'video' ? 'Add videos' : 'Add images';

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {label}
        </Typography>
        <Button
          size="small"
          variant="outlined"
          startIcon={busy ? <CircularProgress size={14} /> : <UploadIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          data-testid={`upload-${name}`}
        >
          {busy ? 'Uploading…' : addLabel}
        </Button>
      </Stack>

      {list.length > 0 && (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 1 }}>
          {list.map((url, idx) => (
            <Box key={`${url}-${idx}`} sx={{ position: 'relative', borderRadius: 1, overflow: 'hidden', border: 1, borderColor: 'divider', aspectRatio: '1 / 1', bgcolor: 'action.hover' }}>
              {kind === 'video' ? (
                <video src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
              ) : (
                <Box component="img" src={url} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <IconButton
                size="small"
                onClick={() => removeAt(idx)}
                aria-label="remove media"
                sx={{ position: 'absolute', top: 2, right: 2, bgcolor: 'rgba(0,0,0,0.55)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}

      {helperText && <Typography variant="caption" color="text.secondary">{helperText}</Typography>}
      <input
        ref={inputRef}
        type="file"
        accept={kind === 'video' ? 'video/*' : 'image/*'}
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      {error && <Alert severity="warning" onClose={() => setError(null)}>{error}</Alert>}
    </Stack>
  );
}
