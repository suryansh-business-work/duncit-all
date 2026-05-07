import { useMemo, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
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
import {
  SLIDERS,
  LOCATIONS,
  SUPER_CATEGORIES,
  CREATE,
  UPDATE,
  DELETE,
  SCOPES,
  SliderForm,
  blankForm,
  toLocalInput,
} from './queries';
import SliderFormDialog from './SliderFormDialog';

export default function SlidersPage() {
  const [scopeFilter, setScopeFilter] = useState<string>('');
  const [search, setSearch] = useState('');

  const { data, loading, error, refetch } = useQuery(SLIDERS, {
    variables: {
      filter: { scope: scopeFilter || undefined, search: search || undefined },
    },
    fetchPolicy: 'cache-and-network',
  });
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: superCatData } = useQuery(SUPER_CATEGORIES);

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SliderForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const superCategories = superCatData?.categories ?? [];
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
      super_category_slug: s.super_category_slug ?? '',
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
      if (form.scope === 'LOCATION' && !form.location_id)
        throw new Error('Pick a location');
      if (form.scope === 'ZONE' && (!form.location_id || !form.zone_name))
        throw new Error('Pick location and zone');

      const payload: any = {
        title: form.title,
        description: form.description,
        media_url: form.media_url,
        media_type: form.media_type,
        link_url: form.link_url,
        scope: form.scope,
        super_category_slug: form.super_category_slug || null,
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
      notifyError(e.message);
    }
  };

  const scopeChip = (s: any) => {
    const meta = SCOPES.find((x) => x.value === s.scope);
    let label = meta?.label ?? s.scope;
    if (s.scope === 'LOCATION') label = `${meta?.label} · ${locName(s.location_id)}`;
    if (s.scope === 'ZONE')
      label = `${meta?.label} · ${locName(s.location_id)} / ${s.zone_name}`;
    return (
      <Chip
        size="small"
        icon={meta?.icon}
        label={label}
        color={
          s.scope === 'GLOBAL' ? 'primary' : s.scope === 'LOCATION' ? 'info' : 'secondary'
        }
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

      <SliderFormDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        setForm={setForm}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        locations={locations}
        zonesForLocation={zonesForLocation}
        superCategories={superCategories}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={2500}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
