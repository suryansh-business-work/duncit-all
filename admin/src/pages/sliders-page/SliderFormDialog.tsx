import {
  Alert,
  Box,
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
import AiFillButton from '../../components/AiFillButton';
import MediaPickerField from '../../components/MediaPickerField';
import { SCOPES, SliderForm } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  form: SliderForm;
  setForm: React.Dispatch<React.SetStateAction<SliderForm>>;
  busy: boolean;
  opError: string | null;
  onSubmit: () => void;
  locations: any[];
  zonesForLocation: any[];
  superCategories: { id: string; name: string; slug: string }[];
}

export default function SliderFormDialog({
  open,
  onClose,
  form,
  setForm,
  busy,
  opError,
  onSubmit,
  locations,
  zonesForLocation,
  superCategories,
}: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
      >
        <span>{form.id ? 'Edit Slider' : 'New Slider'}</span>
        <AiFillButton
          entity="SLIDER"
          onFill={(d) =>
            setForm((prev) => ({
              ...prev,
              title: d.title ?? prev.title,
              description: d.description ?? prev.description,
              media_url: d.media_url ?? prev.media_url,
              media_type: d.media_type === 'VIDEO' ? 'VIDEO' : 'IMAGE',
              link_url: d.link_url ?? prev.link_url,
              sort_order: Number.isFinite(Number(d.sort_order))
                ? Number(d.sort_order)
                : prev.sort_order,
            }))
          }
        />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Slider ID"
              value={form.slider_id}
              onChange={(e) => setForm({ ...form, slider_id: e.target.value })}
              disabled={!!form.id}
              helperText={form.id ? 'Locked' : 'Auto if blank'}
              fullWidth
            />
          </Stack>
          <TextField
            label="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <MediaPickerField
                label="Media URL"
                value={form.media_url}
                onChange={(url) => setForm({ ...form, media_url: url })}
                folder="/sliders"
                required
              />
            </Box>
            <TextField
              select
              label="Type"
              value={form.media_type}
              onChange={(e) =>
                setForm({ ...form, media_type: e.target.value as 'IMAGE' | 'VIDEO' })
              }
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="IMAGE">Image</MenuItem>
              <MenuItem value="VIDEO">Video</MenuItem>
            </TextField>
          </Stack>
          <TextField
            label="Tap link / deeplink (optional)"
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            fullWidth
            placeholder="https://… or duncit://club/abc"
          />

          <TextField
            select
            label="Super category"
            value={form.super_category_slug}
            onChange={(e) => setForm({ ...form, super_category_slug: e.target.value })}
            helperText="Leave Global to show across all super categories"
            fullWidth
          >
            <MenuItem value="">Global (all super categories)</MenuItem>
            {superCategories.map((c) => (
              <MenuItem key={c.slug} value={c.slug}>
                {c.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Scope"
            value={form.scope}
            onChange={(e) =>
              setForm({
                ...form,
                scope: e.target.value as any,
                ...(e.target.value === 'GLOBAL' ? { location_id: '', zone_name: '' } : {}),
                ...(e.target.value !== 'ZONE' ? { zone_name: '' } : {}),
              })
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
                setForm({ ...form, location_id: e.target.value, zone_name: '' })
              }
              fullWidth
              required
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
              onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
              fullWidth
              required
              disabled={!form.location_id}
              helperText={!form.location_id ? 'Select a location first' : ''}
            >
              {zonesForLocation.map((z: any) => (
                <MenuItem key={z.zone_name} value={z.zone_name}>
                  {z.zone_name}
                </MenuItem>
              ))}
            </TextField>
          )}

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) =>
                setForm({ ...form, sort_order: Number(e.target.value) || 0 })
              }
              fullWidth
              helperText="Lower shows first"
            />
            {form.id && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <Switch
                  checked={form.is_active}
                  onChange={(_, v) => setForm({ ...form, is_active: v })}
                />
                <Typography variant="body2">
                  {form.is_active ? 'Active' : 'Inactive'}
                </Typography>
              </Stack>
            )}
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Starts at (optional)"
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Ends at (optional)"
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>

          {opError && <Alert severity="error">{opError}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit} disabled={busy}>
          {busy ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
