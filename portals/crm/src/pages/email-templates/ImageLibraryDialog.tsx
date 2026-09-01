import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import DeleteIcon from '@mui/icons-material/Delete';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { MB, useImagekitBase64Upload, useUploadCaps } from '@duncit/media-picker';
import {
  ADD_TEMPLATE_IMAGE,
  REMOVE_TEMPLATE_IMAGE,
  type EmailAsset,
} from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

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
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { upload } = useImagekitBase64Upload();
  const caps = useUploadCaps('PORTALS');
  const [addImage] = useMutation<any>(ADD_TEMPLATE_IMAGE);
  const [removeImage] = useMutation<any>(REMOVE_TEMPLATE_IMAGE);

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    if (file.size > caps.maxImageBytes) {
      setError(
        t('crm.emailTemplates.maxSizeCompressAndTryAgain', {
          vars: { max: Math.round(caps.maxImageBytes / MB) },
        })
      );
      return;
    }
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
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        {t('crm.emailTemplates.imageLibrary')}
        <AiMonitoringChip />
      </DialogTitle>
      <DialogContent dividers>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mb: 1.5
          }}>
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              flex: 1
            }}>
            Uploaded images for this template. Use <b>{t('crm.emailTemplates.insert')}</b> to add an <code>&lt;mj-image&gt;</code>, or <b>Copy</b> the URL.
          </Typography>
          <DuncitButton variant="contained" size="small" startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <UploadIcon />} onClick={() => inputRef.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : 'Upload'}
          </DuncitButton>
        </Stack>
        {error && <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => setError(null)}>{error}</Alert>}
        {images.length === 0 ? (
          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
              py: 3,
              textAlign: 'center'
            }}>{t('crm.emailTemplates.noImagesYetClickUpload')}</Typography>
        ) : (
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 1.5 }}>
            {images.map((img) => (
              <Box key={img.url} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                <Box component="img" src={img.url} alt={img.name ?? ''} sx={{ width: '100%', height: 110, objectFit: 'cover', display: 'block', bgcolor: 'action.hover' }} />
                <Stack
                  direction="row"
                  sx={{
                    alignItems: "center",
                    p: 0.5
                  }}>
                  <Tooltip title="Insert <mj-image>">
                    <DuncitIconButton size="small" color="primary" onClick={() => onInsert(img.url)}><AddPhotoAlternateIcon fontSize="small" /></DuncitIconButton>
                  </Tooltip>
                  <Tooltip title={copied === img.url ? 'Copied!' : 'Copy URL'}>
                    <DuncitIconButton size="small" onClick={() => copy(img.url)}><ContentCopyIcon fontSize="small" /></DuncitIconButton>
                  </Tooltip>
                  <Box sx={{ flex: 1 }} />
                  <Tooltip title={t('crm.emailTemplates.removeFromLibrary')}>
                    <DuncitIconButton size="small" color="error" onClick={() => remove(img.url)}><DeleteIcon fontSize="small" /></DuncitIconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Box>
        )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onClose}>{t('shell.common.close')}</DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
