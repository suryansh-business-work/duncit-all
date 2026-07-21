import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import {
  ImageCropStep,
  suggestPresetKey,
  useMediaDimensions,
  useUploadSettings,
} from '@duncit/media-picker';
import type { CropRect } from '@duncit/media-picker';

interface Props {
  file: File | null;
  onCancel: () => void;
  onConfirm: (crop: CropRect | null, cropPreset: string | null) => void;
}

/**
 * Crop step for status IMAGES (videos skip straight to upload): the admin
 * crop presets with the suggested (closest-aspect) one called out; No Crop
 * keeps the picked file untouched.
 */
export default function StatusCropDialog({ file, onCancel, onConfirm }: Readonly<Props>) {
  const settings = useUploadSettings('MOBILE_MWEB');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropKey, setCropKey] = useState<string | null>(null);
  const [cropRect, setCropRect] = useState<CropRect | null>(null);

  useEffect(() => {
    setCropKey(null);
    setCropRect(null);
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const dims = useMediaDimensions(previewUrl, 'image');
  const presets = settings?.crop_presets ?? [];
  const selectedKey = cropKey ?? settings?.default_crop_key ?? 'NO_CROP';
  const suggestedKey = dims ? suggestPresetKey(dims.width, dims.height, presets) : null;
  const croppable = presets.some(
    (p) => p.key === selectedKey && p.enabled && p.width > 0 && p.height > 0,
  );

  return (
    <Dialog open={!!file} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Crop status image</DialogTitle>
      <DialogContent dividers>
        {previewUrl && (
          <ImageCropStep
            previewUrl={previewUrl}
            presets={presets}
            selectedKey={selectedKey}
            suggestedKey={suggestedKey}
            onSelectKey={setCropKey}
            onCropComplete={setCropRect}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          onClick={() => onConfirm(croppable ? cropRect : null, croppable ? selectedKey : null)}
        >
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
