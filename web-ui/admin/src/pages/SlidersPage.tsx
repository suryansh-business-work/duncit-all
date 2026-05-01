import { useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import AiFillButton from '../components/AiFillButton';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import PublicIcon from '@mui/icons-material/Public';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import MapIcon from '@mui/icons-material/Map';
import MediaPickerField from '../components/MediaPickerField';

const SLIDERS = gql`
  query Sliders($filter: SliderFilterInput) {
    sliders(filter: $filter) {
      id
      slider_id
      title
      description
      media_url
      media_type
      link_url
      scope
      location_id
      zone_name
      sort_order
      starts_at
      ends_at
      is_active
    }
  }
`;
const LOCATIONS = gql`
  query LocationsForSlider {
    locations {
      id
      location_id
      location_name
      location_zones {
        zone_name
      }
    }
  }
`;
const CREATE = gql`
  mutation CreateSlider($input: CreateSliderInput!) {
    createSlider(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateSlider($id: ID!, $input: UpdateSliderInput!) {
    updateSlider(slider_doc_id: $id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteSlider($id: ID!) {
    deleteSlider(slider_doc_id: $id)
  }
`;

const SCOPES = [
  { value: 'GLOBAL', label: 'Global', icon: <PublicIcon fontSize="small" /> },
  { value: 'LOCATION', label: 'Location', icon: <LocationOnIcon fontSize="small" /> },
  { value: 'ZONE', label: 'Zone', icon: <MapIcon fontSize="small" /> },
];

interface SliderForm {
  id?: string;
  slider_id: string;
  title: string;
  description: string;
  media_url: string;
  media_type: 'IMAGE' | 'VIDEO';
  link_url: string;
  scope: 'GLOBAL' | 'LOCATION' | 'ZONE';
  location_id: string;
  zone_name: string;
  sort_order: number;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
}

const blankForm: SliderForm = {
  slider_id: '',
  title: '',
  description: '',
  media_url: '',
  media_type: 'IMAGE',
  link_url: '',
  scope: 'GLOBAL',
  location_id: '',
  zone_name: '',
  sort_order: 0,
  starts_at: '',
  ends_at: '',
  is_active: true,
};

const toLocalInput = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function SlidersPage() {
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useQuery(SLIDERS, {
    variables: {
      filter: {
        scope: scopeFilter || undefined,
        search: search || undefined,
      },
    },
    fetchPolicy: 'cache-and-network',
  });
  const { data: locsData } = useQuery(LOCATIONS);

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SliderForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const locName = (id?: string | null) =>
    locations.find((l: any) => l.id === id)?.location_name ?? '—';

  const zonesForLocation = useMemo(() => {
    const loc = locations.find((l: any) => l.id === form.location_id);
    return loc?.location_zones ?? [];
  }, [locations, form.location_id]);

  const openCreate = () => {
    setForm(blankForm);
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (s: any) => {
    setForm({
      id: s.id,
      slider_id: s.slider_id,
      title: s.title,
      description: s.description ?? '',
      media_url: s.media_url,
      media_type: s.media_type,
      link_url: s.link_url ?? '',
      scope: s.scope,
      location_id: s.location_id ?? '',
      zone_name: s.zone_name ?? '',
      sort_order: s.sort_order ?? 0,
      starts_at: toLocalInput(s.starts_at),
      ends_at: toLocalInput(s.ends_at),
      is_active: s.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (!form.title.trim()) throw new Error('Title required');
      if (!form.media_url.trim()) throw new Error('Media URL required');
      if (form.scope === 'LOCATION' && !form.location_id) throw new Error('Pick a location');
      if (form.scope === 'ZONE' && (!form.location_id || !form.zone_name))
        throw new Error('Pick location and zone');

      const payload: any = {
        title: form.title,
        description: form.description,
        media_url: form.media_url,
        media_type: form.media_type,
        link_url: form.link_url,
        scope: form.scope,
        location_id: form.scope === 'GLOBAL' ? null : form.location_id,
        zone_name: form.scope === 'ZONE' ? form.zone_name : null,
        sort_order: Number(form.sort_order) || 0,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      };

      if (form.id) {
        await updateMut({
          variables: { id: form.id, input: { ...payload, is_active: form.is_active } },
        });
      } else {
        await createMut({
          variables: { input: { ...payload, slider_id: form.slider_id || undefined } },
        });
      }
      setToast('Saved');
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: any) => {
    if (!confirm(`Delete slider "${s.title}"?`)) return;
    try {
      await deleteMut({ variables: { id: s.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const scopeChip = (s: any) => {
    const meta = SCOPES.find((x) => x.value === s.scope);
    let label = meta?.label ?? s.scope;
    if (s.scope === 'LOCATION') label = `${meta?.label} · ${locName(s.location_id)}`;
    if (s.scope === 'ZONE') label = `${meta?.label} · ${locName(s.location_id)} / ${s.zone_name}`;
    return (
      <Chip
        size="small"
        icon={meta?.icon}
        label={label}
        color={s.scope === 'GLOBAL' ? 'primary' : s.scope === 'LOCATION' ? 'info' : 'secondary'}
        variant="outlined"
      />
    );
  };

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <ViewCarouselIcon color="primary" />
            <Typography variant="h5">Sliders</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Hub app banners. Target Global, a specific Location, or a Zone inside a Location.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            size="small"
            label="Scope"
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">All</MenuItem>
            {SCOPES.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            placeholder="Search title"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Slider
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && !data ? (
            <Stack alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Preview</TableCell>
                  <TableCell>Title</TableCell>
                  <TableCell>Scope</TableCell>
                  <TableCell>Link</TableCell>
                  <TableCell>Order</TableCell>
                  <TableCell>Window</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.sliders ?? []).map((s: any) => (
                  <TableRow key={s.id} hover>
                    <TableCell>
                      <Avatar
                        variant="rounded"
                        src={s.media_type === 'IMAGE' ? s.media_url : undefined}
                        sx={{ width: 56, height: 36 }}
                      >
                        {s.title[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {s.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.slider_id}
                      </Typography>
                    </TableCell>
                    <TableCell>{scopeChip(s)}</TableCell>
                    <TableCell>
                      {s.link_url ? (
                        <Typography
                          variant="caption"
                          sx={{ maxWidth: 220, display: 'inline-block', wordBreak: 'break-all' }}
                        >
                          {s.link_url}
                        </Typography>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{s.sort_order}</TableCell>
                    <TableCell>
                      <Typography variant="caption" display="block">
                        {s.starts_at ? new Date(s.starts_at).toLocaleDateString() : '—'} →{' '}
                        {s.ends_at ? new Date(s.ends_at).toLocaleDateString() : '∞'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={s.is_active ? 'Active' : 'Inactive'}
                        color={s.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(s)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(s)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.sliders?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No sliders yet.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
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
                sort_order: Number.isFinite(Number(d.sort_order)) ? Number(d.sort_order) : prev.sort_order,
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
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
