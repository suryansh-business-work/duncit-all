import { useCallback, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Box, Chip, MenuItem, Slider, Stack, TextField, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { croppablePresets, presetAspect } from './cropUtils';
import type { CropRect, UploadCropPreset } from './types';

interface Props {
  previewUrl: string;
  presets: UploadCropPreset[];
  /** Selected preset key — NO_CROP (or any 0×0 preset) hides the cropper. */
  selectedKey: string;
  /** Preset whose aspect best matches the source image (suggested chip). */
  suggestedKey: string | null;
  onSelectKey: (key: string) => void;
  onCropComplete: (rect: CropRect | null) => void;
}

/**
 * Image crop step (react-easy-crop) driven by the admin-managed crop presets:
 * No Crop (default) shows the plain preview; any resolution preset locks the
 * cropper to its aspect and reports the source-pixel rect for the server-side
 * sharp crop. The suggested preset (closest aspect) is called out on its chip.
 */
export default function ImageCropStep({
  previewUrl,
  presets,
  selectedKey,
  suggestedKey,
  onSelectKey,
  onCropComplete,
}: Readonly<Props>) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const active = croppablePresets(presets).find((p) => p.key === selectedKey);
  const options = presets.filter((p) => p.enabled);

  const handleComplete = useCallback(
    (_area: Area, areaPixels: Area) => {
      onCropComplete({
        x: areaPixels.x,
        y: areaPixels.y,
        width: areaPixels.width,
        height: areaPixels.height,
      });
    },
    [onCropComplete],
  );

  const selectPreset = (key: string) => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onSelectKey(key);
    const croppable = croppablePresets(presets).some((p) => p.key === key);
    if (!croppable) onCropComplete(null);
  };

  return (
    <Stack spacing={1.5} alignItems="center" sx={{ width: '100%', maxWidth: 480 }}>
      <TextField
        select
        fullWidth
        size="small"
        label="Crop"
        value={selectedKey}
        onChange={(e) => selectPreset(e.target.value)}
      >
        {options.map((preset) => (
          <MenuItem key={preset.key} value={preset.key}>
            <Stack direction="row" spacing={1} alignItems="center">
              <span>{preset.label}</span>
              {preset.key === suggestedKey && (
                <Chip
                  icon={<AutoAwesomeIcon />}
                  label="Suggested"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Stack>
          </MenuItem>
        ))}
      </TextField>

      {active ? (
        <>
          <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: 'common.black', borderRadius: 2, overflow: 'hidden' }}>
            <Cropper
              image={previewUrl}
              crop={crop}
              zoom={zoom}
              aspect={presetAspect(active)}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleComplete}
            />
          </Box>
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ width: '100%' }}>
            <Typography variant="caption" color="text.secondary">
              Zoom
            </Typography>
            <Slider
              size="small"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(_e, value) => setZoom(value as number)}
              aria-label="Crop zoom"
            />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Output {active.width}×{active.height}px — drag to position, pinch or slide to zoom.
          </Typography>
        </>
      ) : (
        <Box sx={{ width: '100%', borderRadius: 2, overflow: 'hidden', bgcolor: 'action.hover' }}>
          <img
            src={previewUrl}
            alt="preview"
            style={{ width: '100%', display: 'block', maxHeight: 300, objectFit: 'contain' }}
          />
        </Box>
      )}
    </Stack>
  );
}
