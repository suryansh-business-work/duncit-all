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
import MediaPickerField from '../../components/MediaPickerField';
import { PAGE_TYPES, type WebsiteContentForm } from './queries';

interface Props {
  open: boolean;
  form: WebsiteContentForm;
  error: string | null;
  busy: boolean;
  onClose: () => void;
  onChange: (form: WebsiteContentForm) => void;
  onSave: () => void;
}

export default function WebsiteContentDialog({
  open,
  form,
  error,
  busy,
  onClose,
  onChange,
  onSave,
}: Props) {
  const setField = <Key extends keyof WebsiteContentForm>(key: Key, value: WebsiteContentForm[Key]) => {
    onChange({ ...form, [key]: value });
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>{form.id ? 'Edit Website Entry' : 'New Website Entry'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Page"
              value={form.type}
              onChange={(event) => setField('type', event.target.value as WebsiteContentForm['type'])}
              fullWidth
            >
              {PAGE_TYPES.map((type) => (
                <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(event) => setField('sort_order', Number(event.target.value) || 0)}
              sx={{ maxWidth: { sm: 180 } }}
            />
          </Stack>
          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setField('title', event.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Slug"
            value={form.slug}
            onChange={(event) => setField('slug', event.target.value)}
            helperText="Leave blank to generate from the title."
            fullWidth
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Category / Team"
              value={form.category}
              onChange={(event) => setField('category', event.target.value)}
              fullWidth
            />
            <TextField
              label="Published at"
              type="datetime-local"
              value={form.published_at}
              onChange={(event) => setField('published_at', event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <TextField
            label="Summary"
            value={form.summary}
            onChange={(event) => setField('summary', event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Body"
            value={form.body}
            onChange={(event) => setField('body', event.target.value)}
            multiline
            minRows={5}
            fullWidth
          />
          <MediaPickerField
            label="Image"
            value={form.image_url}
            onChange={(value) => setField('image_url', value)}
            folder="/website"
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="CTA label"
              value={form.cta_label}
              onChange={(event) => setField('cta_label', event.target.value)}
              fullWidth
            />
            <TextField
              label="CTA URL"
              value={form.cta_url}
              onChange={(event) => setField('cta_url', event.target.value)}
              fullWidth
            />
          </Stack>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_published}
                onChange={(_event, checked) => setField('is_published', checked)}
              />
            }
            label="Published"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={onSave} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}