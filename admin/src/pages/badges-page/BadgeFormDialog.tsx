import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import { CONDITIONS, type BadgeForm } from './queries';

interface Props {
  open: boolean;
  form: BadgeForm;
  setForm: (f: BadgeForm) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function BadgeFormDialog({ open, form, setForm, busy, onClose, onSave }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Edit Badge' : 'New Badge'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
          <MediaPickerField
            label="Badge image"
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            folder="/badges"
            helperText="Upload a square PNG/SVG (transparent background recommended)"
          />
          <TextField
            select
            label="Condition"
            value={form.condition_type}
            onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
            fullWidth
          >
            {CONDITIONS.map((c) => (
              <MenuItem key={c.v} value={c.v}>
                {c.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label="Threshold"
            value={form.threshold}
            onChange={(e) =>
              setForm({ ...form, threshold: Math.max(1, +e.target.value || 1) })
            }
            disabled={form.condition_type === 'MANUAL'}
            fullWidth
          />
          <Stack direction="row" spacing={1} alignItems="center">
            <Switch
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            <Typography variant="body2">Active (auto-evaluated)</Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={onSave} variant="contained" disabled={!form.title || busy}>
          {form.id ? 'Save' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
