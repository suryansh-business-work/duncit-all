import {
  Alert,
  Box,
  Button,
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
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import MediaPickerField from '../../components/MediaPickerField';
import LocationHierarchyFields from './LocationHierarchyFields';
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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{form.id ? 'Edit Location' : 'New Location'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <LocationHierarchyFields form={form} setForm={setForm} />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Primary PIN code"
              value={form.location_pincode}
              onChange={(e) => setForm({ ...form, location_pincode: e.target.value })}
              required
              sx={{ maxWidth: 200 }}
            />
            {form.id && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={form.is_active}
                  onChange={(_, v) => setForm({ ...form, is_active: v })}
                />
                <Typography variant="body2">{form.is_active ? 'Active' : 'Inactive'}</Typography>
              </Stack>
            )}
          </Stack>
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
              <Button size="small" startIcon={<AddIcon />} onClick={addZone}>
                Add Area
              </Button>
            </Stack>
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
                    label="Area code"
                    value={z.zone_code}
                    onChange={(e) => updateZone(i, { zone_code: e.target.value })}
                    sx={{ width: { xs: '100%', sm: 140 } }}
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
