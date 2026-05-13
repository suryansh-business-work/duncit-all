import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import MediaPickerField from '../../components/MediaPickerField';
import LocationHierarchyFields from './LocationHierarchyFields';
import { AI_FILL_LOCATION_AREAS } from './queries';
import type { LocForm, ZoneEdit } from './types';

interface Props {
  open: boolean;
  form: LocForm;
  setForm: React.Dispatch<React.SetStateAction<LocForm>>;
  busy: boolean;
  opError: string | null;
  onClose: () => void;
  onSubmit: () => void;
  updateZone: (idx: number, patch: Partial<ZoneEdit>) => void;
  addZone: () => void;
  removeZone: (idx: number) => void;
}

export default function LocationFormDialog({
  open,
  form,
  setForm,
  busy,
  opError,
  onClose,
  onSubmit,
  updateZone,
  addZone,
  removeZone,
}: Props) {
  const [aiError, setAiError] = useState<string | null>(null);
  const [fillAreas, { loading: fillingAreas }] = useMutation(AI_FILL_LOCATION_AREAS);

  const fillAreasWithAi = async () => {
    setAiError(null);
    if (!form.country.trim() || !form.state.trim() || !form.city.trim()) {
      setAiError('Select country, state and city before using AI fill.');
      return;
    }
    try {
      const result = await fillAreas({
        variables: {
          input: {
            country: form.country,
            state: form.state,
            city: form.city,
          },
        },
      });
      const parsed = JSON.parse(result.data?.aiFillLocationAreas || '{}');
      const zones = (parsed.zones ?? [])
        .map((zone: any) => ({
          zone_name: String(zone.zone_name ?? '').trim(),
          zone_code: '',
          pincode: String(zone.pincode ?? '').trim(),
        }))
        .filter((zone: ZoneEdit) => zone.zone_name && zone.pincode);
      if (zones.length === 0) throw new Error('AI did not return any localities with PIN codes.');
      setForm((prev) => ({
        ...prev,
        location_pincode: zones[0].pincode,
        zones,
      }));
    } catch (error: any) {
      setAiError(error?.message || 'Could not fill localities with AI.');
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{form.id ? 'Edit Location' : 'New Location'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <LocationHierarchyFields form={form} setForm={setForm} />
          {form.id && (
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={form.is_active}
                onChange={(_, v) => setForm({ ...form, is_active: v })}
              />
              <Typography variant="body2">{form.is_active ? 'Active' : 'Inactive'}</Typography>
            </Stack>
          )}
          <MediaPickerField
            label="Location image URL"
            value={form.location_image}
            onChange={(url) => setForm({ ...form, location_image: url })}
            folder="/locations"
            required
          />

          <Box>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1 }}
            >
              <Typography variant="subtitle2">Localities / Areas</Typography>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  color="secondary"
                  variant="outlined"
                  startIcon={
                    fillingAreas ? <CircularProgress size={14} /> : <AutoAwesomeIcon fontSize="small" />
                  }
                  onClick={fillAreasWithAi}
                  disabled={busy || fillingAreas}
                >
                  {fillingAreas ? 'Filling…' : 'Fill with AI'}
                </Button>
                <Button size="small" startIcon={<AddIcon />} onClick={addZone}>
                  Add Area
                </Button>
              </Stack>
            </Stack>
            {aiError && <Alert severity="error" sx={{ mb: 1 }}>{aiError}</Alert>}
            <Stack spacing={1.5}>
              {form.zones.map((z, i) => (
                <Stack
                  key={i}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ xs: 'stretch', sm: 'center' }}
                >
                  <TextField
                    size="small"
                    label="Locality / Area"
                    value={z.zone_name}
                    onChange={(e) => updateZone(i, { zone_name: e.target.value })}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    size="small"
                    label="PIN code"
                    value={z.pincode}
                    onChange={(e) => updateZone(i, { pincode: e.target.value })}
                    sx={{ width: { xs: '100%', sm: 140 } }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => removeZone(i)}
                    disabled={form.zones.length === 1}
                  >
                    <RemoveCircleOutlineIcon />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>

          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !form.location_name.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
