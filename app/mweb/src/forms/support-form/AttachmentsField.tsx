import { useRef, useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import MovieIcon from '@mui/icons-material/Movie';
import { UPLOAD_ATTACHMENT } from '../../pages/support-chat/queries';
import { describeAttachment, isVideoUpload, typeLabel } from '../../utils/attachment';

const MAX_BYTES = 100 * 1024 * 1024; // Images & documents up to 100 MB.
const VIDEO_MAX_BYTES = 50 * 1024 * 1024; // Videos are capped tighter at 50 MB.
const ACCEPT =
  'image/*,video/*,application/pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx';

interface Props {
  attachments: string[];
  setAttachments: (next: string[]) => void;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read the selected file'));
    reader.readAsDataURL(file);
  });
}

interface PreviewProps {
  url: string;
  onRemove: () => void;
}

/** Type-aware preview: image thumbnail vs a small file chip for video/doc. */
function AttachmentPreview({ url, onRemove }: Readonly<PreviewProps>) {
  const info = describeAttachment(url);
  const removeButton = (
    <IconButton
      size="small"
      aria-label="Remove attachment"
      onClick={onRemove}
      sx={{
        position: 'absolute',
        top: -8,
        right: -8,
        bgcolor: 'background.paper',
        border: 1,
        borderColor: 'divider',
        width: 24,
        height: 24,
      }}
    >
      <CloseIcon sx={{ fontSize: 14 }} />
    </IconButton>
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
        alignItems="center"
        sx={{ height: 72, px: 1, maxWidth: 168, border: 1, borderColor: 'divider', borderRadius: 2 }}
      >
        {info.kind === 'video' ? <MovieIcon color="action" /> : <InsertDriveFileIcon color="action" />}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="caption" noWrap sx={{ display: 'block', fontWeight: 700 }}>
            {info.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
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
  const [uploadFile, { loading: uploading }] = useMutation(UPLOAD_ATTACHMENT);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (isVideoUpload(file.name, file.type) && file.size > VIDEO_MAX_BYTES) {
      setError('Video is too large (max 50 MB)');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('File is too large (max 100 MB)');
      return;
    }
    setError(null);
    try {
      const fileBase64 = await readAsDataUrl(file);
      const res = await uploadFile({
        variables: {
          fileBase64,
          fileName: file.name,
          mimeType: file.type,
          folder: '/support',
          allow_documents: true,
        },
      });
      const url = res.data?.uploadImageToImagekit?.url;
      if (url) setAttachments([...attachments, url].slice(0, 5));
    } catch (err: any) {
      setError(err?.message || 'Upload failed');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          Attach files ({attachments.length}/5)
        </Typography>
        <Button
          size="small"
          startIcon={uploading ? <CircularProgress size={16} /> : <AttachFileIcon />}
          disabled={uploading || attachments.length >= 5}
          onClick={() => fileRef.current?.click()}
          sx={{ minHeight: 40 }}
        >
          Add files
        </Button>
      </Stack>
      <input ref={fileRef} type="file" accept={ACCEPT} hidden onChange={pickFile} />
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
