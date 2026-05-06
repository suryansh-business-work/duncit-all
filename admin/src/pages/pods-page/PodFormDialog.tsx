import {
  Alert,
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
import MediaListField from '../../components/MediaListField';
import PodPriceBreakdown from './PodPriceBreakdown';
import { POD_TYPES, OCCURRENCES, PodForm } from './queries';

interface Props {
  open: boolean;
  onClose: () => void;
  form: PodForm;
  setForm: React.Dispatch<React.SetStateAction<PodForm>>;
  isFree: boolean;
  busy: boolean;
  opError: string | null;
  clubs: any[];
  filteredLocations: any[];
  zoneOptions: string[];
  users: any[];
  userName: (id: string) => string;
  onSubmit: () => void;
  finance?: { platform_fee_pct: number; gst_pct: number; currency_symbol?: string };
}

export default function PodFormDialog({
  open,
  onClose,
  form,
  setForm,
  isFree,
  busy,
  opError,
  clubs,
  filteredLocations,
  zoneOptions,
  users,
  userName,
  onSubmit,
  finance,
}: Props) {
  const onAiFill = (d: any) => {
    const startsInDays = Number(d.starts_in_days) || 3;
    const durationMinutes = Number(d.duration_minutes) || 90;
    const start = new Date();
    start.setDate(start.getDate() + startsInDays);
    start.setHours(19, 0, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
    const fmt = (dt: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    };
    setForm((prev) => {
      const next = {
        ...prev,
        pod_title: d.pod_title ?? prev.pod_title,
        pod_description: d.pod_description ?? prev.pod_description,
        pod_hashtag_text: d.pod_hashtag_text ?? prev.pod_hashtag_text,
        media_text: d.media_text ?? prev.media_text,
        pod_info: d.pod_info ?? prev.pod_info,
        no_of_spots: Number(d.no_of_spots) || prev.no_of_spots,
        pod_amount: Number(d.pod_amount) || prev.pod_amount,
        pod_type: typeof d.pod_type === 'string' ? d.pod_type : prev.pod_type,
        pod_occurrence:
          typeof d.pod_occurrence === 'string' ? d.pod_occurrence : prev.pod_occurrence,
        zone_name: d.zone_name ?? prev.zone_name,
        pod_date_time: fmt(start),
        pod_end_date_time: fmt(end),
      };
      if (next.pod_type && next.pod_type.includes('FREE')) next.pod_amount = 0;
      return next;
    });
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1,
        }}
      >
        <span>{form.id ? 'Edit Pod' : 'New Pod'}</span>
        <AiFillButton entity="POD" onFill={onAiFill} />
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Pod title"
              value={form.pod_title}
              onChange={(e) => setForm({ ...form, pod_title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Pod ID"
              value={form.pod_id}
              onChange={(e) => setForm({ ...form, pod_id: e.target.value })}
              disabled={!!form.id}
              helperText={form.id ? 'Locked' : 'Auto if blank'}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Club"
              value={form.club_id}
              onChange={(e) => setForm({ ...form, club_id: e.target.value })}
              fullWidth
              required
              helperText="Club is the parent — its venues become the available cities."
            >
              {clubs.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.club_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="City (Location)"
              value={form.location_id}
              onChange={(e) => setForm({ ...form, location_id: e.target.value })}
              fullWidth
              required
              disabled={!form.club_id}
              helperText={
                !form.club_id
                  ? 'Pick a club first'
                  : filteredLocations.length === 0
                    ? 'This club has no venues — add them in Clubs page.'
                    : "Loaded from the selected club's venues."
              }
            >
              {filteredLocations.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.location_name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Zone"
              value={form.zone_name}
              onChange={(e) => setForm({ ...form, zone_name: e.target.value })}
              fullWidth
              disabled={!form.location_id || zoneOptions.length === 0}
              helperText={
                !form.location_id
                  ? 'Pick a city first'
                  : zoneOptions.length === 0
                    ? 'No zones configured for this city'
                    : 'Pod is scoped to this zone'
              }
            >
              <MenuItem value="">— Any zone —</MenuItem>
              {zoneOptions.map((z) => (
                <MenuItem key={z} value={z}>
                  {z}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            select
            label="Hosts"
            value={form.pod_hosts_id}
            onChange={(e) =>
              setForm({
                ...form,
                pod_hosts_id:
                  typeof e.target.value === 'string'
                    ? e.target.value.split(',')
                    : (e.target.value as unknown as string[]),
              })
            }
            SelectProps={{
              multiple: true,
              renderValue: (sel: any) => (sel as string[]).map(userName).join(', '),
            }}
            fullWidth
            required
          >
            {users.map((u) => (
              <MenuItem key={u.user_id} value={u.user_id}>
                {u.full_name || u.email}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Description"
            value={form.pod_description}
            onChange={(e) => setForm({ ...form, pod_description: e.target.value })}
            fullWidth
            multiline
            minRows={2}
            required
          />
          <TextField
            label="Hashtags (space or comma separated)"
            value={form.pod_hashtag_text}
            onChange={(e) => setForm({ ...form, pod_hashtag_text: e.target.value })}
            fullWidth
            placeholder="#cricket #weekend"
          />
          <MediaListField
            label="Images & videos"
            value={form.media_text}
            onChange={(v) => setForm({ ...form, media_text: v })}
            folder="/pods"
            helperText="Cover image first; rest become a gallery."
          />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start date & time"
              type="datetime-local"
              value={form.pod_date_time}
              onChange={(e) => setForm({ ...form, pod_date_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
              required
            />
            <TextField
              label="End date & time"
              type="datetime-local"
              value={form.pod_end_date_time}
              onChange={(e) => setForm({ ...form, pod_end_date_time: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              select
              label="Pod type"
              value={form.pod_type}
              onChange={(e) => setForm({ ...form, pod_type: e.target.value })}
              fullWidth
            >
              {POD_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Occurrence"
              value={form.pod_occurrence}
              onChange={(e) => setForm({ ...form, pod_occurrence: e.target.value })}
              fullWidth
            >
              {OCCURRENCES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Amount (₹)"
              type="number"
              value={form.pod_amount}
              onChange={(e) =>
                setForm({ ...form, pod_amount: Number(e.target.value) || 0 })
              }
              inputProps={{ min: 0, max: 1999 }}
              disabled={isFree}
              helperText={
                isFree
                  ? 'Free pod — amount must be 0'
                  : 'GROSS price the user pays (incl. fee + GST). Range 0 – 1999.'
              }
              fullWidth
              sx={{ flex: 1 }}
            />
            <TextField
              label="No. of spots"
              type="number"
              value={form.no_of_spots}
              onChange={(e) =>
                setForm({ ...form, no_of_spots: Number(e.target.value) || 0 })
              }
              inputProps={{ min: 0 }}
              fullWidth
              sx={{ flex: 1 }}
            />
            {form.id && (
              <Stack direction="row" alignItems="center" spacing={1} sx={{ flexShrink: 0 }}>
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
          {!isFree && Number(form.pod_amount) > 0 && finance && (
            <PodPriceBreakdown amount={form.pod_amount} finance={finance} />
          )}
          <TextField
            label="Pod info / additional notes"
            value={form.pod_info}
            onChange={(e) => setForm({ ...form, pod_info: e.target.value })}
            fullWidth
            multiline
            minRows={2}
          />
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
