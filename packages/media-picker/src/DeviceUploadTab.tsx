import type { MutableRefObject, ChangeEvent } from 'react';
import { useTranslation } from './i18n/useTranslation';
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

/** Just the translate function, so the helpers below stay at module scope. */
type Translate = ReturnType<typeof useTranslation>['t'];

// Copy + hint derived from the accepted MIME list so a PDF-only picker never
// claims "image" and a video-only picker (pod reels) never claims "image".
function dropHints(
  accept: string,
  settings: UploadSettings | null,
  t: Translate,
): { label: string; hint: string } {
  const imageMb = settings?.max_image_mb ?? 15;
  const videoMb = settings?.max_video_mb ?? 100;
  if (/pdf/i.test(accept) && !/image\//i.test(accept)) {
    return { label: t('media.device.choosePdf'), hint: t('media.device.hintPdf') };
  }
  if (/video\//i.test(accept) && !/image\//i.test(accept)) {
    return {
      label: t('media.device.chooseVideo'),
      hint: t('media.device.hintVideo', { vars: { mb: videoMb } }),
    };
  }
  return {
    label: t('media.device.chooseImage'),
    hint: t('media.device.hintImage', { vars: { mb: imageMb } }),
  };
}

function mediaKind(picked: File | null): 'image' | 'video' | 'other' {
  if (picked?.type.startsWith('image/')) return 'image';
  if (picked?.type.startsWith('video/')) return 'video';
  return 'other';
}

const STAGE_KEYS: Record<UploadStage, string> = {
  uploading: 'media.device.uploading',
  compressing: 'media.device.compressing',
  processing: 'media.device.croppingAndCompressing',
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
  const { t } = useTranslation();
  const isPdf = picked?.type === 'application/pdf';
  const kind = mediaKind(picked);
  const { label, hint } = dropHints(accept, settings, t);
  const dims = useMediaDimensions(previewUrl, kind);
  const suggestedKey =
    kind === 'image' && dims
      ? suggestPresetKey(dims.width, dims.height, settings?.crop_presets ?? [])
      : null;
  const stageLabel = t(STAGE_KEYS[stage]);

  return (
    <Stack
      spacing={2}
      sx={{
        alignItems: "center",
        py: 2
      }}>
      <input ref={fileInputRef} type="file" accept={accept} onChange={onPickFile} hidden />
      {previewUrl && isPdf && (
        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            width: '100%',
            maxWidth: 480,
            p: 4,
            borderRadius: 2,
            bgcolor: 'action.hover'
          }}>
          <PictureAsPdfIcon color="error" sx={{ fontSize: 56 }} />
          <Typography
            variant="body2"
            noWrap
            sx={{
              fontWeight: 700,
              maxWidth: '100%'
            }}>
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
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 600,
              mt: 1
            }}>
            {label}
          </Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {hint}
          </Typography>
        </Box>
      )}
      {picked && (
        <Stack
          spacing={1}
          sx={{
            alignItems: "center",
            width: '100%'
          }}>
          <FileDetails file={picked} dims={dims} />
          <Button size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {t('media.device.change')}
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
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {stageLabel}…{uploadPct === null ? '' : ` ${uploadPct}%`}
          </Typography>
        </Box>
      )}
    </Stack>
  );
}
