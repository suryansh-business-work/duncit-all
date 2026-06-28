import { useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Slider,
  Stack,
} from '@mui/material';
import RotateRightIcon from '@mui/icons-material/RotateRight';
import { getCroppedImage } from './cropImage';

interface Props {
  open: boolean;
  src: string | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (dataUrl: string) => void;
}

/** Crop + zoom + rotate + preview before a profile photo is uploaded (item 9). */
export default function CropDialog({ open, src, saving, onCancel, onConfirm }: Readonly<Props>) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [area, setArea] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const reset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setArea(null);
  };

  const cancel = () => {
    reset();
    onCancel();
  };

  const confirm = async () => {
    if (!src || !area) return;
    setProcessing(true);
    try {
      const dataUrl = await getCroppedImage(src, area, rotation);
      reset();
      onConfirm(dataUrl);
    } finally {
      setProcessing(false);
    }
  };

  const busy = processing || saving;

  return (
    <Dialog open={open && !!src} onClose={busy ? undefined : cancel} fullWidth maxWidth="xs">
      <DialogTitle>Adjust photo</DialogTitle>
      <DialogContent>
        <Box sx={{ position: 'relative', width: '100%', height: 300, bgcolor: '#111', borderRadius: 2 }}>
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onComplete}
            />
          )}
        </Box>
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Slider
            aria-label="Zoom"
            value={zoom}
            min={1}
            max={3}
            step={0.05}
            onChange={(_e, v) => setZoom(v as number)}
          />
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton aria-label="Rotate" onClick={() => setRotation((r) => (r + 90) % 360)}>
              <RotateRightIcon />
            </IconButton>
            <Slider
              aria-label="Rotation"
              value={rotation}
              min={0}
              max={360}
              step={1}
              onChange={(_e, v) => setRotation(v as number)}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={cancel} disabled={busy}>
          Discard
        </Button>
        <Button
          variant="contained"
          onClick={confirm}
          disabled={busy || !area}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
