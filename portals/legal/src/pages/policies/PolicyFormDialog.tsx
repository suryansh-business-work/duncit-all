import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import RichTextEditor from '../../components/RichTextEditor';

export interface PolicyFormState {
  slug: string;
  title: string;
  content: string;
  is_active: boolean;
  sort_order: number;
}

export const EMPTY_POLICY_FORM: PolicyFormState = {
  slug: '',
  title: '',
  content: '',
  is_active: true,
  sort_order: 0,
};

interface Props {
  open: boolean;
  isNew: boolean;
  editingTitle: string;
  form: PolicyFormState;
  error: string | null;
  saving: boolean;
  onTitle: (title: string) => void;
  onChange: (patch: Partial<PolicyFormState>) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export default function PolicyFormDialog({
  open,
  isNew,
  editingTitle,
  form,
  error,
  saving,
  onTitle,
  onChange,
  onClose,
  onSubmit,
}: Readonly<Props>) {
  return (
    <Dialog open={open} onClose={() => !saving && onClose()} fullWidth maxWidth="md">
      <DialogTitle>{isNew ? 'New Policy' : `Edit · ${editingTitle}`}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Title" value={form.title} onChange={(e) => onTitle(e.target.value)} required fullWidth autoFocus />
            <TextField
              label="Slug"
              value={form.slug}
              onChange={(e) => onChange({ slug: e.target.value })}
              required
              fullWidth
              helperText="lowercase letters, numbers and dashes"
            />
          </Stack>
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) => onChange({ sort_order: Number(e.target.value) })}
              size="small"
              sx={{ width: 150 }}
            />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => onChange({ is_active: e.target.checked })} />}
              label={form.is_active ? 'Active (visible in app)' : 'Hidden'}
            />
          </Stack>
          <Box>
            <Typography variant="caption" color="text.secondary">Content</Typography>
            <RichTextEditor value={form.content} onChange={(v) => onChange({ content: v })} minHeight={260} />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={saving}>
          {isNew ? 'Create' : 'Save changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
