import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AiFillButton from '../../components/AiFillButton';
import DateTimeField from '../../components/DateTimeField';
import { type SliderForm } from './queries';
import SliderBasicFields from './SliderBasicFields';
import SliderScopeFields from './SliderScopeFields';

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
          <SliderBasicFields form={form} setForm={setForm} />
          <SliderScopeFields
            form={form}
            setForm={setForm}
            locations={locations}
            zonesForLocation={zonesForLocation}
            superCategories={superCategories}
          />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Sort order"
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })}
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
            <DateTimeField
              label="Starts at (optional)"
              value={form.starts_at}
              onChange={(iso) => setForm({ ...form, starts_at: iso })}
            />
            <DateTimeField
              label="Ends at (optional)"
              value={form.ends_at}
              onChange={(iso) => setForm({ ...form, ends_at: iso })}
              minDateTime={form.starts_at ? new Date(form.starts_at) : null}
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
