import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import MediaPickerField from '../../components/MediaPickerField';
import { TITLE_MAX, type SomethingForYouForm } from './queries';

interface Props {
  open: boolean;
  form: SomethingForYouForm;
  setForm: (next: SomethingForYouForm) => void;
  busy: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ItemFormDialog({
  open,
  form,
  setForm,
  busy,
  onClose,
  onSave,
}: Readonly<Props>) {
  const tooLong = form.title.length > TITLE_MAX;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{form.id ? 'Edit card' : 'New card'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Counted here rather than trimmed later: the card is a fixed size
              on both surfaces, so a longer headline is not wrapped, it is cut
              off — and this is the last moment anyone can choose what stays. */}
          <TextField
            label="Title"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
            fullWidth
            error={tooLong}
            helperText={`${form.title.length}/${TITLE_MAX} — shown over the image, up to three lines`}
            inputProps={{ maxLength: TITLE_MAX }}
          />
          <MediaPickerField
            label="Card image"
            value={form.image_url}
            onChange={(url) => setForm({ ...form, image_url: url })}
            folder="/something-for-you"
            helperText="A portrait image. Each card has its own; the frame and type are the same everywhere."
          />
          <TextField
            label="Bottom text"
            value={form.bottom_text}
            onChange={(event) => setForm({ ...form, bottom_text: event.target.value })}
            fullWidth
            helperText="The label on the strip along the bottom, e.g. Refer and Earn"
          />
          <TextField
            label="Opens (optional)"
            value={form.link_path}
            onChange={(event) => setForm({ ...form, link_path: event.target.value })}
            fullWidth
            placeholder="/referral"
            helperText="An in-app path. Both mWeb and the app route it themselves. Leave empty for a card that does nothing."
          />
          <TextField
            label="Sort order"
            type="number"
            value={form.sort_order}
            onChange={(event) =>
              setForm({ ...form, sort_order: Number(event.target.value) || 0 })
            }
            fullWidth
            helperText="Lowest first, left to right."
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(event) => setForm({ ...form, is_active: event.target.checked })}
              />
            }
            label="Show on Home"
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={busy || !form.title.trim() || tooLong}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
