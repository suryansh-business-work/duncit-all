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
import { type NotifForm, SCOPES } from './helpers';

interface Props {
  open: boolean;
  onClose: () => void;
  form: NotifForm;
  setForm: React.Dispatch<React.SetStateAction<NotifForm>>;
  busy: boolean;
  opError: string | null;
  onSubmit: () => void;
  locations: any[];
  zones: { zone_name: string }[];
  users: any[];
}

export default function NotificationFormDialog({
  open,
  onClose,
  form,
  setForm,
  busy,
  opError,
  onSubmit,
  locations,
  zones,
  users,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>New Notification</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {opError && <Alert severity="error">{opError}</Alert>}
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            required
            fullWidth
          />
          <TextField
            label="Body"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            required
            multiline
            minRows={3}
            fullWidth
          />
          <MediaPickerField
            label="Image URL (optional)"
            value={form.image_url}
            onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
            folder="/notifications"
          />
          <TextField
            label="Link URL (optional, e.g. /pods/abc)"
            value={form.link_url}
            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
            fullWidth
          />
          <FormControlLabel
            control={
              <Switch
                checked={form.silent}
                onChange={(e) => setForm((f) => ({ ...f, silent: e.target.checked }))}
              />
            }
            label="Silent (in-app only — no push alert)"
          />
          <TextField
            select
            label="Audience"
            value={form.scope}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                scope: e.target.value as NotifForm['scope'],
                location_id: '',
                zone_name: '',
                target_user_ids: [],
              }))
            }
            fullWidth
          >
            {SCOPES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>

          {(form.scope === 'LOCATION' || form.scope === 'ZONE') && (
            <TextField
              select
              label="Location"
              value={form.location_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, location_id: e.target.value, zone_name: '' }))
              }
              fullWidth
            >
              {locations.map((l: any) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.location_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {form.scope === 'ZONE' && (
            <TextField
              select
              label="Zone"
              value={form.zone_name}
              onChange={(e) => setForm((f) => ({ ...f, zone_name: e.target.value }))}
              disabled={!form.location_id}
              fullWidth
            >
              {zones.map((z) => (
                <MenuItem key={z.zone_name} value={z.zone_name}>
                  {z.zone_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          {form.scope === 'USER' && (
            <TextField
              select
              label="Users"
              value={form.target_user_ids}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  target_user_ids:
                    typeof e.target.value === 'string'
                      ? e.target.value.split(',')
                      : (e.target.value as string[]),
                }))
              }
              SelectProps={{ multiple: true }}
              fullWidth
            >
              {users.map((u: any) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.full_name || u.email || u.phone_number}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy}>
          {busy ? 'Sending…' : 'Send Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
