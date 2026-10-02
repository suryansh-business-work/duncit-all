import type { MutableRefObject, ChangeEvent } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { activateOnKey } from '../activateOnKey';
import { Box, LinearProgress, Stack, Typography } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { DuncitButton } from '@duncit/buttons';
import FileDetails, { useMediaDimensions } from '../FileDetails';
import ImageCropStep from '../ImageCropStep';
import { suggestPresetKey } from '../cropUtils';
import type { UploadStage } from '../useDeviceUpload';
import type { CropRect, UploadSettings } from '../types';
import { STAGE_KEYS, dropHints, mediaKind } from './deviceHints';

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
      <input ref={fileInputRef} type="file" accept={accept} onChange={onPickFile} hidden data-testid="media-device-file-input" />
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
          role="button"
          tabIndex={0}
          data-testid="media-device-dropzone"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={activateOnKey(() => fileInputRef.current?.click())}
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
          <DuncitButton size="small" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {t('media.device.change')}
          </DuncitButton>
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
