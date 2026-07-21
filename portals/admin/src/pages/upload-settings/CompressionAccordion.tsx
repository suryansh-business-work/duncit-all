import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  FormControlLabel,
  Slider,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { UploadSettings } from './queries';

interface Props {
  settings: UploadSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => void;
}

/** Accordion 4 — server-side compression: sharp for images, FFmpeg for videos. */
export default function CompressionAccordion({ settings, saving, onSave }: Readonly<Props>) {
  const [imageOn, setImageOn] = useState(settings.image_compression_enabled);
  const [quality, setQuality] = useState(settings.image_quality);
  const [maxDim, setMaxDim] = useState(String(settings.image_max_dimension));
  const [videoOn, setVideoOn] = useState(settings.video_compression_enabled);
  const [crf, setCrf] = useState(settings.video_crf);
  const [maxHeight, setMaxHeight] = useState(String(settings.video_max_height));

  useEffect(() => {
    setImageOn(settings.image_compression_enabled);
    setQuality(settings.image_quality);
    setMaxDim(String(settings.image_max_dimension));
    setVideoOn(settings.video_compression_enabled);
    setCrf(settings.video_crf);
    setMaxHeight(String(settings.video_max_height));
  }, [settings]);

  const dimInvalid = !/^\d+$/.test(maxDim) || Number(maxDim) < 320;
  const heightInvalid = !/^\d+$/.test(maxHeight) || Number(maxHeight) < 240;

  const save = () =>
    onSave({
      image_compression_enabled: imageOn,
      image_quality: quality,
      image_max_dimension: Number(maxDim),
      video_compression_enabled: videoOn,
      video_crf: crf,
      video_max_height: Number(maxHeight),
    });

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>Compression (sharp images · FFmpeg videos)</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2.5}>
          <FormControlLabel
            control={<Switch checked={imageOn} onChange={(e) => setImageOn(e.target.checked)} />}
            label="Compress images server-side with sharp before they reach ImageKit"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Stack sx={{ flex: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Image quality: {quality}
              </Typography>
              <Slider
                size="small"
                min={1}
                max={100}
                value={quality}
                disabled={!imageOn}
                onChange={(_e, value) => setQuality(value as number)}
                aria-label="Image quality"
              />
            </Stack>
            <TextField
              label="Max image dimension (px)"
              size="small"
              value={maxDim}
              disabled={!imageOn}
              onChange={(e) => setMaxDim(e.target.value)}
              error={dimInvalid}
              helperText={dimInvalid ? 'Minimum 320px.' : 'Longest edge cap. Default 1920.'}
            />
          </Stack>
          <FormControlLabel
            control={<Switch checked={videoOn} onChange={(e) => setVideoOn(e.target.checked)} />}
            label="Compress videos server-side with FFmpeg after direct upload (H.264 + faststart)"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ sm: 'center' }}>
            <Stack sx={{ flex: 1, px: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Video CRF: {crf} (lower = higher quality, larger file)
              </Typography>
              <Slider
                size="small"
                min={18}
                max={40}
                value={crf}
                disabled={!videoOn}
                onChange={(_e, value) => setCrf(value as number)}
                aria-label="Video CRF"
              />
            </Stack>
            <TextField
              label="Max video height (px)"
              size="small"
              value={maxHeight}
              disabled={!videoOn}
              onChange={(e) => setMaxHeight(e.target.value)}
              error={heightInvalid}
              helperText={heightInvalid ? 'Minimum 240px.' : 'Taller videos are scaled down. Default 1080.'}
            />
          </Stack>
          <Button
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
            disabled={saving || dimInvalid || heightInvalid}
            onClick={save}
          >
            Save compression
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
