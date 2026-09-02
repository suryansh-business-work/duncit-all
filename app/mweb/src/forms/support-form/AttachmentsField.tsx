import { useRef, useState } from 'react';
import { Avatar, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MovieIcon from '@mui/icons-material/Movie';
import { DuncitButton, DuncitRoundButton } from '@duncit/buttons';
import { ATTACHMENT_ACCEPT_ALL } from '@duncit/media-picker';
import { useImagekitUpload } from '../../utils/imagekit';
import { useAttachmentGate } from '../../utils/uploadLimits';
import { describeAttachment, typeLabel } from '../../utils/attachment';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  attachments: string[];
  setAttachments: (next: string[]) => void;
}

interface PreviewProps {
  url: string;
  onRemove: () => void;
}

/** Type-aware preview: image thumbnail vs a small file chip for video/doc. */
function AttachmentPreview({ url, onRemove }: Readonly<PreviewProps>) {
  const { t } = useTranslation();
  const info = describeAttachment(url);
  const removeButton = (
    <DuncitRoundButton
      size="small"
      tone="paper"
      aria-label={t('mweb.common.removeAttachment')}
      onClick={onRemove}
      sx={{ position: 'absolute', top: -8, right: -8 }}
    >
      <CloseIcon />
    </DuncitRoundButton>
  );

  if (info.kind === 'image') {
    return (
      <Box sx={{ position: 'relative', width: 72, height: 72 }}>
        <Avatar
          variant="rounded"
          src={url}
          sx={{ width: 72, height: 72, '& img': { objectFit: 'cover' } }}
        />
        {removeButton}
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <Stack
        direction="row"
        spacing={0.75}
        sx={{
          alignItems: "center",
          height: 72,
          px: 1,
          maxWidth: 168,
          border: 1,
          borderColor: 'divider',
          borderRadius: '16px'
        }}>
        {info.kind === 'video' ? <MovieIcon color="action" /> : <InsertDriveFileIcon color="action" />}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 700 }}>
            {info.name}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {typeLabel(info.ext)}
          </Typography>
        </Box>
      </Stack>
      {removeButton}
    </Box>
  );
}

export default function AttachmentsField({ attachments, setAttachments }: Readonly<Props>) {
  const [error, setError] = useState<string | null>(null);
  const { upload, uploading } = useImagekitUpload();
  const gate = useAttachmentGate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const tooLarge = gate(file);
    if (tooLarge) {
      setError(tooLarge);
      return;
    }
    setError(null);
    try {
      const url = await upload(file, '/support');
      if (url) setAttachments([...attachments, url].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          mb: 1
        }}>
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            flex: 1
          }}>
          Attach files ({attachments.length}/5)
        </Typography>
        <DuncitButton
          size="small"
          startIcon={uploading ? <CircularProgress size={16} /> : <AttachFileIcon />}
          disabled={uploading || attachments.length >= 5}
          onClick={() => fileRef.current?.click()}
          sx={{ minHeight: 40 }}
        >
          Add files
        </DuncitButton>
      </Stack>
      <input ref={fileRef} type="file" accept={ATTACHMENT_ACCEPT_ALL} hidden onChange={pickFile} />
      {error && (
        <Chip
          size="small"
          color="error"
          label={error}
          onDelete={() => setError(null)}
          sx={{ alignSelf: 'flex-start', mb: 1 }}
        />
      )}
      {attachments.length > 0 && (
        <Stack direction="row" useFlexGap sx={{ flexWrap: 'wrap', gap: 1 }}>
          {attachments.map((url, i) => (
            <AttachmentPreview
              key={url + i}
              url={url}
              onRemove={() => setAttachments(attachments.filter((_, j) => j !== i))}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}
