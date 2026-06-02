import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

interface Props {
  accept: string;
  fileInputRef: React.MutableRefObject<HTMLInputElement | null>;
  picked: File | null;
  previewUrl: string | null;
  uploadPct: number | null;
  uploading: boolean;
  onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function DeviceUploadTab({
  accept,
  fileInputRef,
  picked,
  previewUrl,
  uploadPct,
  uploading,
  onPickFile,
}: Props) {
  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onPickFile}
        hidden
      />
      {previewUrl ? (
        <Box
          sx={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: 'action.hover',
          }}
        >
          {picked?.type.startsWith('video/') ? (
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
              style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'contain' }}
            />
          )}
        </Box>
      ) : (
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
            Click to choose an image
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG, JPG, WebP, GIF · max 15 MB · uploads to ImageKit
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
