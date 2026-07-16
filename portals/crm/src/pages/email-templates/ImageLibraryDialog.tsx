import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { useImagekitBase64Upload } from '@duncit/media-picker';
import { ADD_TEMPLATE_IMAGE, REMOVE_TEMPLATE_IMAGE, type EmailAsset } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';

interface Props {
  open: boolean;
  /** Owning template — uploads persist to it immediately. */
  templateId: string;
  images: EmailAsset[];
  onClose: () => void;
  onChangeImages: (next: EmailAsset[]) => void;
  /** Explicit insert of an <mj-image> for the chosen URL. Never auto-inserts. */
  onInsert: (url: string) => void;
}

/** Per-template image library: upload (saved immediately), browse, copy or insert. */
export default function ImageLibraryDialog({ open, templateId, images, onClose, onChangeImages, onInsert }: Readonly<Props>) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { upload } = useImagekitBase64Upload();
  const [addImage] = useMutation(ADD_TEMPLATE_IMAGE);
  const [removeImage] = useMutation(REMOVE_TEMPLATE_IMAGE);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (file.size > 8 * 1024 * 1024) { setError('Max 8MB. Compress and try again.'); return; }
    setBusy(true);
    try {
      const { url } = await upload(file, { folder: 'crm/email-templates', fallbackMimeType: 'image/png' });
      // Persist immediately to the template's library.
      const saved = await addImage({ variables: { id: templateId, image: { url, name: file.name } } });
      onChangeImages(saved.data?.addCrmEmailTemplateImage?.images ?? [...images, { url, name: file.name }]);
    } catch (e) {
      setError(parseApiError(e));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (url: string) => {
    setError(null);
    try {
      const res = await removeImage({ variables: { id: templateId, url } });
      onChangeImages(res.data?.removeCrmEmailTemplateImage?.images ?? images.filter((i) => i.url !== url));
    } catch (e) {
      setError(parseApiError(e));
    }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1500); } catch { /* ignore */ }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Image library</DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Uploaded images for this template. Use <b>Insert</b> to add an <code>&lt;mj-image&gt;</code>, or <b>Copy</b> the URL.
          </Typography>
          <Button variant="contained" size="small" startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />} onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </Button>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
        {images.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No images yet. Click "Upload".</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {images.map((img) => (
              <Box key={img.url} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box component="img" src={img.url} alt={img.name ?? ''} sx={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }} />
                <Stack direction="row" alignItems="center" sx={{ p: 0.5 }}>
                  <Tooltip title="Insert <mj-image>">
                    <IconButton size="small" color="primary" onClick={() => onInsert(img.url)}><AddPhotoAlternateIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Tooltip title={copied === img.url ? 'Copied!' : 'Copy URL'}>
                    <IconButton size="small" onClick={() => copy(img.url)}><ContentCopyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title="Remove from library">
                    <IconButton size="small" color="error" onClick={() => remove(img.url)}><DeleteIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
