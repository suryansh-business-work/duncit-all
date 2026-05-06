import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import IconPickerField from '../../components/IconPickerField';
import { Level, FormState } from './queries';

interface DialogState {
  open: boolean;
  level: Level;
  parentId: string | null;
  form: FormState;
}

interface Props {
  dialog: DialogState | null;
  setDialog: (d: DialogState | null) => void;
  busy: boolean;
  opError: string | null;
  onSubmit: () => void;
}

export default function CategoryFormDialog({
  dialog,
  setDialog,
  busy,
  opError,
  onSubmit,
}: Props) {
  return (
    <Dialog open={!!dialog?.open} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>
        {dialog?.form.id ? 'Edit' : 'New'}{' '}
        {dialog?.level === 'SUPER'
          ? 'Super Category'
          : dialog?.level === 'CATEGORY'
            ? 'Category'
            : 'Sub-Category'}
      </DialogTitle>
      <DialogContent>
        {dialog && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name"
              value={dialog.form.name}
              onChange={(e) =>
                setDialog({ ...dialog, form: { ...dialog.form, name: e.target.value } })
              }
              fullWidth
              required
            />
            <IconPickerField
              value={dialog.form.icon}
              onChange={(next) =>
                setDialog({ ...dialog, form: { ...dialog.form, icon: next } })
              }
              helperText="Search Material icons (e.g. Pets, SportsSoccer) or paste an emoji."
            />
            <TextField
              label="Description"
              value={dialog.form.description}
              onChange={(e) =>
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, description: e.target.value },
                })
              }
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Images & Videos (one URL per line)"
              value={dialog.form.mediaText}
              onChange={(e) =>
                setDialog({
                  ...dialog,
                  form: { ...dialog.form, mediaText: e.target.value },
                })
              }
              multiline
              minRows={3}
              helperText="URLs ending in .mp4/.mov/.webm are stored as VIDEO, others as IMAGE."
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Sort order"
                type="number"
                value={dialog.form.sort_order}
                onChange={(e) =>
                  setDialog({
                    ...dialog,
                    form: { ...dialog.form, sort_order: Number(e.target.value) || 0 },
                  })
                }
                sx={{ maxWidth: 160 }}
              />
              {dialog.form.id && (
                <TextField
                  label="Status"
                  select
                  value={dialog.form.is_active ? 'active' : 'inactive'}
                  onChange={(e) =>
                    setDialog({
                      ...dialog,
                      form: { ...dialog.form, is_active: e.target.value === 'active' },
                    })
                  }
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>
              )}
            </Stack>
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setDialog(null)}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={busy || !dialog?.form.name?.trim()}
        >
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
