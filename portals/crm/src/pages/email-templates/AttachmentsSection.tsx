import { useRef, useState } from 'react';
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
import { AiMonitoringChip } from '@duncit/ai-monitoring/mui';
import { useImagekitBase64Upload } from '@duncit/media-picker';
import type { EmailAsset } from '../../api/emailTemplates.gql';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';

interface Props {
  attachments: EmailAsset[];
  onChange: (next: EmailAsset[]) => void;
}

/** Files attached to every send of this template (test send + lead emails). */
export default function AttachmentsSection({ attachments, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { upload } = useImagekitBase64Upload();

  const onFile = async (file: File | null) => {
    if (!file) return;
    setError(null);
    const mime = file.type || '';
    if (!mime.startsWith('image/') && !mime.startsWith('video/')) {
      setError(t('crm.emailTemplates.onlyImageOrVideoFilesAre'));
      return;
    }
    if (file.size > 25 * 1024 * 1024) { setError(t('crm.emailTemplates.max25mbPerAttachment')); return; }
    setBusy(true);
    try {
      const { url } = await upload(file, { folder: 'crm/email-attachments' });
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
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: attachments.length ? 1 : 0
        }}>
        <AttachFileIcon fontSize="small" color="action" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2">{t('crm.emailTemplates.attachments')}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>{t('crm.emailTemplates.imageOrVideoSentWithEvery')}</Typography>
        </Box>
        <AiMonitoringChip />
        <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={14} /> : <AttachFileIcon />} onClick={() => inputRef.current?.click()} disabled={busy}>
          {busy ? 'Uploading…' : 'Add file'}
        </Button>
      </Stack>
      {error && <Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>}
      {attachments.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{
            flexWrap: "wrap",
            mt: 1
          }}>
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
