import { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { PRESET_USAGE_NOTES, type UploadCropPreset, type UploadSettings } from './queries';

interface Props {
  settings: UploadSettings;
  saving: boolean;
  onSave: (input: Record<string, unknown>) => void;
}

type Draft = UploadCropPreset;

const toDraft = (presets: UploadCropPreset[]): Draft[] =>
  presets.map(({ key, label, width, height, enabled }) => ({ key, label, width, height, enabled }));

/** Accordion 2 — image crop resolution presets (No Crop default, 16:9,
 * Vertical, Pod Feature, Pod Moment, …) with the researched usage notes. */
export default function CropPresetsAccordion({ settings, saving, onSave }: Readonly<Props>) {
  const [presets, setPresets] = useState<Draft[]>(toDraft(settings.crop_presets));
  const [defaultKey, setDefaultKey] = useState(settings.default_crop_key);

  useEffect(() => {
    setPresets(toDraft(settings.crop_presets));
    setDefaultKey(settings.default_crop_key);
  }, [settings]);

  const patch = (key: string, changes: Partial<Draft>) => {
    setPresets((prev) => prev.map((p) => (p.key === key ? { ...p, ...changes } : p)));
  };

  const enabledPresets = presets.filter((p) => p.enabled);
  const defaultValid = enabledPresets.some((p) => p.key === defaultKey);

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography fontWeight={700}>Image crop resolution settings</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Presets offered by the crop step of every upload dialog. Resolutions were researched
            from the actual render sites across the apps — see each preset&apos;s note.
          </Typography>
          {presets.map((preset) => (
            <Stack
              key={preset.key}
              direction={{ xs: 'column', md: 'row' }}
              spacing={1.5}
              alignItems={{ md: 'center' }}
              sx={{ p: 1.5, borderRadius: 1.5, bgcolor: 'action.hover' }}
            >
              <Switch
                checked={preset.enabled}
                onChange={(e) => patch(preset.key, { enabled: e.target.checked })}
                inputProps={{ 'aria-label': `${preset.label} enabled` }}
              />
              <Stack sx={{ flex: 1, minWidth: 180 }}>
                <Typography variant="body2" fontWeight={700}>
                  {preset.label}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {PRESET_USAGE_NOTES[preset.key] ?? 'Custom preset.'}
                </Typography>
              </Stack>
              <TextField
                label="Width"
                size="small"
                sx={{ width: 110 }}
                value={String(preset.width)}
                disabled={preset.key === 'NO_CROP'}
                onChange={(e) => patch(preset.key, { width: Number(e.target.value) || 0 })}
              />
              <TextField
                label="Height"
                size="small"
                sx={{ width: 110 }}
                value={String(preset.height)}
                disabled={preset.key === 'NO_CROP'}
                onChange={(e) => patch(preset.key, { height: Number(e.target.value) || 0 })}
              />
            </Stack>
          ))}
          <TextField
            select
            size="small"
            label="Default crop"
            value={defaultValid ? defaultKey : ''}
            onChange={(e) => setDefaultKey(e.target.value)}
            helperText="Preselected in every crop step — No Crop keeps uploads untouched by default."
            sx={{ maxWidth: 320 }}
          >
            {enabledPresets.map((p) => (
              <MenuItem key={p.key} value={p.key}>
                {p.label}
              </MenuItem>
            ))}
          </TextField>
          <Button
            variant="contained"
            sx={{ alignSelf: 'flex-start' }}
            disabled={saving || !defaultValid}
            onClick={() => onSave({ crop_presets: presets, default_crop_key: defaultKey })}
          >
            Save crop presets
          </Button>
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
