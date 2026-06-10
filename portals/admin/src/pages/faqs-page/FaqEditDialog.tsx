import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { FormState } from './helpers';

interface Props {
  editing: any | null;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  saving: boolean;
  error: string | null;
  supers: any[];
  onClose: () => void;
  onSubmit: () => void;
}

export default function FaqEditDialog({
  editing,
  form,
  setForm,
  saving,
  error,
  supers,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  return (
    <Dialog open={!!editing} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{editing?.id ? 'Edit FAQ' : 'New FAQ'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            select
            label="Super Category"
            value={form.super_category_id}
            onChange={(e) => setForm({ ...form, super_category_id: e.target.value })}
            fullWidth
            helperText="Leave empty to make this a general FAQ"
          >
            <MenuItem value="">General (no category)</MenuItem>
            {supers.map((sc) => (
              <MenuItem key={sc.id} value={sc.id}>
                {sc.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Question"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            fullWidth
            required
          />
          <TextField
            label="Answer"
            value={form.answer}
            onChange={(e) => setForm({ ...form, answer: e.target.value })}
            multiline
            minRows={4}
            fullWidth
            required
          />
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
              sx={{ width: 160 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
              }
              label="Active"
            />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
