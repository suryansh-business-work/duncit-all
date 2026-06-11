import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { UPLOAD_IMAGE } from '../../api/crm.gql';
import type { EmailAsset } from '../../api/emailTemplates.gql';
import { fileToBase64 } from '../../utils/fileToBase64';
import { parseApiError } from '../../utils/parseApiError';

interface Props {
  attachments: EmailAsset[];
  onChange: (next: EmailAsset[]) => void;
}

/** Files attached to every send of this template (test send + lead emails). */
export default function AttachmentsSection({ attachments, onChange }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upload] = useMutation(UPLOAD_IMAGE);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    const mime = file.type || '';
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
      setError('Only image or video files are allowed.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) { setError('Max 25MB per attachment.'); return; }
    setBusy(true);
    try {
      const fileBase64 = await fileToBase64(file);
      const res = await upload({ variables: { fileBase64, fileName: file.name, mimeType: mime, folder: 'crm/email-attachments' } });
      const url = res.data?.uploadImageToImagekit?.url ?? '';
      if (!url) throw new Error('Upload failed');
      onChange([...attachments, { url, name: file.name }]);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: attachments.length ? 1 : 0 }}>
        <AttachFileIcon fontSize="small" color="action" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">Attachments</Typography>
          <Typography variant="caption" color="text.secondary">Image or video — sent with every email that uses this template (max 25MB each).</Typography>
        </Box>
        <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={14} /> : <AttachFileIcon />} onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Add file'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
      {attachments.length > 0 && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {attachments.map((a) => (
            <Chip
              key={a.url}
              label={<Link href={a.url} target="_blank" rel="noopener noreferrer" underline="hover" color="inherit">{a.name || a.url.split('/').pop()}</Link>}
              onDelete={() => onChange(attachments.filter((x) => x.url !== a.url))}
              variant="outlined"
            />
          ))}
        </Stack>
      )}
      <input ref={inputRef} type="file" accept="image/*,video/*" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </Box>
  );
}
