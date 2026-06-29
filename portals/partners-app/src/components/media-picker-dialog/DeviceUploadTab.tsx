import { RefObject } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

interface DeviceUploadTabProps {
  fileInputRef: RefObject<HTMLInputElement>;
  accept: string;
  picked: File | null;
  previewUrl: string | null;
  uploadPct: number | null;
  uploading: boolean;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

// Copy + hint derived from the accepted MIME list so a PDF-only picker never
// claims "image".
function dropHints(accept: string): { label: string; hint: string } {
  if (/pdf/i.test(accept) && !/image\//i.test(accept)) {
    return { label: 'Click to choose a PDF', hint: 'PDF only · max 50 MB · uploads to ImageKit' };
  }
  return { label: 'Click to choose an image', hint: 'PNG, JPG, WebP, GIF · max 15 MB · uploads to ImageKit' };
}

export default function DeviceUploadTab({
  fileInputRef,
  accept,
  picked,
  previewUrl,
  uploadPct,
  uploading,
  onPickFile,
}: Readonly<DeviceUploadTabProps>) {
  const isPdf = picked?.type === 'application/pdf';
  const isVideo = picked?.type.startsWith('video/') ?? false;
  const { label, hint } = dropHints(accept);
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onPickFile}
        hidden
      />
      {previewUrl && isPdf && (
        <Stack alignItems="center" spacing={1} sx={{ width: '100%', maxWidth: 480, p: 4, borderRadius: 2, bgcolor: 'action.hover' }}>
          <PictureAsPdfIcon color="error" sx={{ fontSize: 56 }} />
          <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
            {picked?.name}
          </Typography>
        </Stack>
      )}
      {previewUrl && !isPdf && (
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'action.hover',
          }}
        >
          {isVideo ? (
            <video
              src={previewUrl}
              controls
              style={{
                width: '100%',
                display: 'block',
                maxHeight: 360,
                objectFit: 'contain',
                background: '#000',
              }}
            />
          ) : (
            <img
              src={previewUrl}
              alt="preview"
              style={{
                width: '100%',
                display: 'block',
                maxHeight: 360,
                objectFit: 'contain',
              }}
            />
          )}
        </Box>
      )}
      {!previewUrl && (
        <Box
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: 'divider',
            borderRadius: 2,
            p: 6,
            width: '100%',
            maxWidth: 480,
            textAlign: 'center',
            cursor: 'pointer',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <CloudUploadIcon color="primary" sx={{ fontSize: 48 }} />
          <Typography variant="subtitle1" fontWeight={600} sx={{ mt: 1 }}>
            {label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        </Box>
      )}
      {picked && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            {picked.name} · {(picked.size / 1024).toFixed(0)} KB
          </Typography>
          <Button
            size="small"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            Change
          </Button>
        </Stack>
      )}
      {uploadPct !== null && (
        <Box sx={{ width: '100%', maxWidth: 480 }}>
          <LinearProgress variant="determinate" value={uploadPct} />
          <Typography variant="caption" color="text.secondary">
            Uploading… {uploadPct}%
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
