import type { MutableRefObject, ChangeEvent } from 'react';
import { Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDetails, { useMediaDimensions } from './FileDetails';
import ImageCropStep from './ImageCropStep';
import { suggestPresetKey } from './cropUtils';
import type { UploadStage } from './useDeviceUpload';
import type { CropRect, UploadSettings } from './types';

interface Props {
  accept: string;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  picked: File | null;
  previewUrl: string | null;
  uploadPct: number | null;
  uploading: boolean;
  stage: UploadStage;
  settings: UploadSettings | null;
  cropKey: string;
  onSelectCropKey: (key: string) => void;
  onCropComplete: (rect: CropRect | null) => void;
  onPickFile: (e: ChangeEvent<HTMLInputElement>) => void;
}

// Copy + hint derived from the accepted MIME list so a PDF-only picker never
// claims "image" and a video-only picker (pod reels) never claims "image".
function dropHints(accept: string, settings: UploadSettings | null): { label: string; hint: string } {
  const imageMb = settings?.max_image_mb ?? 15;
  const videoMb = settings?.max_video_mb ?? 100;
  if (/pdf/i.test(accept) && !/image\//i.test(accept)) {
    return { label: 'Click to choose a PDF', hint: 'PDF only · max 50 MB · uploads to ImageKit' };
  }
  if (/video\//i.test(accept) && !/image\//i.test(accept)) {
    return {
      label: 'Click to choose a video',
      hint: `MP4, MOV or WebM · max ${videoMb} MB · uploads to ImageKit`,
    };
  }
  return {
    label: 'Click to choose an image',
    hint: `PNG, JPG, WebP, GIF · max ${imageMb} MB · uploads to ImageKit`,
  };
}

function mediaKind(picked: File | null): 'image' | 'video' | 'other' {
  if (picked?.type.startsWith('image/')) return 'image';
  if (picked?.type.startsWith('video/')) return 'video';
  return 'other';
}

const STAGE_LABELS: Record<UploadStage, string> = {
  uploading: 'Uploading',
  compressing: 'Compressing',
  processing: 'Cropping & compressing',
};

export default function DeviceUploadTab({
  accept,
  fileInputRef,
  picked,
  previewUrl,
  uploadPct,
  uploading,
  stage,
  settings,
  cropKey,
  onSelectCropKey,
  onCropComplete,
  onPickFile,
}: Readonly<Props>) {
  const isPdf = picked?.type === 'application/pdf';
  const kind = mediaKind(picked);
  const { label, hint } = dropHints(accept, settings);
  const dims = useMediaDimensions(previewUrl, kind);
  const suggestedKey =
    kind === 'image' && dims
      ? suggestPresetKey(dims.width, dims.height, settings?.crop_presets ?? [])
      : null;
  const stageLabel = STAGE_LABELS[stage];

  return (
    <Stack spacing={2} alignItems="center" sx={{ py: 2 }}>
      <input ref={fileInputRef} type="file" accept={accept} onChange={onPickFile} hidden />
      {previewUrl && isPdf && (
        <Stack
          alignItems="center"
          spacing={1}
          sx={{ width: '100%', maxWidth: 480, p: 4, borderRadius: 2, bgcolor: 'action.hover' }}
        >
          <PictureAsPdfIcon color="error" sx={{ fontSize: 56 }} />
          <Typography variant="body2" fontWeight={700} noWrap sx={{ maxWidth: '100%' }}>
            {picked?.name}
          </Typography>
        </Stack>
      )}
      {previewUrl && kind === 'video' && (
        <Box sx={{ width: '100%', maxWidth: 480, borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}>
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
          >
            <track kind="captions" />
          </video>
        </Box>
      )}
      {previewUrl && kind === 'image' && (
        <ImageCropStep
          previewUrl={previewUrl}
          presets={settings?.crop_presets ?? []}
          selectedKey={cropKey}
          suggestedKey={suggestedKey}
          onSelectKey={onSelectCropKey}
          onCropComplete={onCropComplete}
        />
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
        <Stack spacing={1} alignItems="center" sx={{ width: '100%' }}>
          <FileDetails file={picked} dims={dims} />
          <Button size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            Change
          </Button>
        </Stack>
      )}
      {uploading && (
        <Box sx={{ width: '100%', maxWidth: 480 }}>
          {uploadPct === null ? (
            <LinearProgress />
          ) : (
            <LinearProgress variant="determinate" value={uploadPct} />
          )}
          <Typography variant="caption" color="text.secondary">
            {stageLabel}…{uploadPct === null ? '' : ` ${uploadPct}%`}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
