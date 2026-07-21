import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Autocomplete,
  Button,
  Chip,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { UploadSettings } from './queries';

const IMAGE_FORMAT_OPTIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'heic'];
const VIDEO_FORMAT_OPTIONS = ['mp4', 'mov', 'webm', 'm4v', '3gp'];

interface Props {
  settings: UploadSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => void;
}

/** Accordion 1+3 — maximum upload sizes and the accepted image/video formats. */
export default function SizesFormatsAccordion({ settings, saving, onSave }: Readonly<Props>) {
  const [imageMb, setImageMb] = useState(String(settings.max_image_mb));
  const [videoMb, setVideoMb] = useState(String(settings.max_video_mb));
  const [imageFormats, setImageFormats] = useState<string[]>(settings.allowed_image_formats);
  const [videoFormats, setVideoFormats] = useState<string[]>(settings.allowed_video_formats);

  useEffect(() => {
    setImageMb(String(settings.max_image_mb));
    setVideoMb(String(settings.max_video_mb));
    setImageFormats(settings.allowed_image_formats);
    setVideoFormats(settings.allowed_video_formats);
  }, [settings]);

  const imageInvalid = !/^\d+$/.test(imageMb) || Number(imageMb) < 1;
  const videoInvalid = !/^\d+$/.test(videoMb) || Number(videoMb) < 1;

  const save = () =>
    onSave({
      max_image_mb: Number(imageMb),
      max_video_mb: Number(videoMb),
      allowed_image_formats: imageFormats,
      allowed_video_formats: videoFormats,
    });

  return (
    <Accordion defaultExpanded>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>Maximum upload sizes & formats</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2.5}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Max image upload size (MB)"
              size="small"
              fullWidth
              value={imageMb}
              onChange={(e) => setImageMb(e.target.value)}
              error={imageInvalid}
              helperText={imageInvalid ? 'Enter a whole number of 1 or more.' : 'Default 15 MB.'}
            />
            <TextField
              label="Max video upload size (MB)"
              size="small"
              fullWidth
              value={videoMb}
              onChange={(e) => setVideoMb(e.target.value)}
              error={videoInvalid}
              helperText={videoInvalid ? 'Enter a whole number of 1 or more.' : 'Default 100 MB.'}
            />
          </Stack>
          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={IMAGE_FORMAT_OPTIONS}
            value={imageFormats}
            onChange={(_e, value) => setImageFormats(value.map((v) => v.toLowerCase()))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Allowed image formats" helperText="File extensions accepted for images." />
            )}
          />
          <Autocomplete
            multiple
            freeSolo
            size="small"
            options={VIDEO_FORMAT_OPTIONS}
            value={videoFormats}
            onChange={(_e, value) => setVideoFormats(value.map((v) => v.toLowerCase()))}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
              ))
            }
            renderInput={(params) => (
              <TextField {...params} label="Allowed video formats" helperText="File extensions accepted for videos." />
            )}
          />
          <Button
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
            disabled={saving || imageInvalid || videoInvalid || !imageFormats.length || !videoFormats.length}
            onClick={save}
          >
            Save sizes & formats
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
