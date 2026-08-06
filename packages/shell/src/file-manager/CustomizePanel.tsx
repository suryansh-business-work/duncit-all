import { Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, TextField, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import {
  buildTransform,
  CROP_MODES,
  EMPTY_TRANSFORM,
  FORMATS,
  transformedUrl,
  type Transform,
} from './transform';

interface Props {
  url: string;
  value: Transform;
  onChange: (next: Transform) => void;
  onCopy: (url: string) => void;
}

const NUMBER_SX = { flex: 1, minWidth: 88 };

/**
 * Resize, crop and recolour by URL.
 *
 * Nothing here writes to the stored file: ImageKit applies these on delivery,
 * so one upload serves every size and a change of mind costs nothing. It also
 * means the original cannot be lost to a crop — which is exactly what makes
 * this safe to hand to anyone.
 */
export default function CustomizePanel({ url, value, onChange, onCopy }: Readonly<Props>) {
  const set = (key: keyof Transform, next: string | boolean) => onChange({ ...value, [key]: next });
  const preview = transformedUrl(url, value);
  const tr = buildTransform(value);

  return (
    <Stack spacing={2}>
      <Box
        sx={{
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box
          component="img"
          src={preview}
          alt="Preview"
          sx={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
        />
      </Box>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Width"
          value={value.width}
          onChange={(e) => set('width', e.target.value)}
          sx={NUMBER_SX}
        />
        <TextField
          size="small"
          label="Height"
          value={value.height}
          onChange={(e) => set('height', e.target.value)}
          sx={NUMBER_SX}
        />
        <TextField
          select
          size="small"
          label="Crop"
          value={value.crop}
          onChange={(e) => set('crop', e.target.value)}
          sx={{ flex: 1, minWidth: 140 }}
        >
          {CROP_MODES.map((mode) => (
            <MenuItem key={mode.value || 'default'} value={mode.value}>
              {mode.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Quality"
          value={value.quality}
          onChange={(e) => set('quality', e.target.value)}
          helperText="1–100"
          sx={NUMBER_SX}
        />
        <TextField
          select
          size="small"
          label="Format"
          value={value.format}
          onChange={(e) => set('format', e.target.value)}
          sx={{ flex: 1, minWidth: 120 }}
        >
          {FORMATS.map((format) => (
            <MenuItem key={format.value || 'auto'} value={format.value}>
              {format.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Corner radius"
          value={value.radius}
          onChange={(e) => set('radius', e.target.value)}
          helperText="px, or max for a circle"
          sx={{ flex: 1, minWidth: 150 }}
        />
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <TextField
          size="small"
          label="Blur"
          value={value.blur}
          onChange={(e) => set('blur', e.target.value)}
          helperText="1–100"
          sx={NUMBER_SX}
        />
        <FormControlLabel
          control={
            <Checkbox
              size="small"
              checked={value.grayscale}
              onChange={(e) => set('grayscale', e.target.checked)}
            />
          }
          label="Grayscale"
        />
      </Stack>

      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {tr ? `tr=${tr}` : 'No transformation — this is the original file.'}
        </Typography>
        <Typography
          variant="caption"
          sx={{ wordBreak: 'break-all', fontFamily: 'monospace', display: 'block', mt: 0.5 }}
        >
          {preview}
        </Typography>
      </Box>

      <Stack spacing={1}>
        <Button
          variant="contained"
          size="small"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopy(preview)}
        >
          Copy this link
        </Button>
        <Button
          size="small"
          startIcon={<RestartAltIcon />}
          onClick={() => onChange(EMPTY_TRANSFORM)}
          disabled={!tr}
        >
          Reset
        </Button>
      </Stack>
    </Stack>
  );
}
