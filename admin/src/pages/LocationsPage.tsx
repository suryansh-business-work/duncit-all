import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
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
import LocationOnIcon from '@mui/icons-material/LocationOn';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import MediaPickerField from '../components/MediaPickerField';

const LOCATIONS = gql`
  query Locations($filter: LocationFilterInput) {
    locations(filter: $filter) {
      id
      location_id
      location_name
      location_image
      location_pincode
      location_zones {
        zone_name
        zone_code
        pincode
      }
      is_active
      updated_at
    }
  }
`;
const CREATE = gql`
  mutation CreateLocation($input: CreateLocationInput!) {
    createLocation(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateLocation($id: ID!, $input: UpdateLocationInput!) {
    updateLocation(location_doc_id: $id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteLocation($id: ID!) {
    deleteLocation(location_doc_id: $id)
  }
`;

interface ZoneEdit {
  zone_name: string;
  zone_code: string;
  pincode: string;
}
interface LocForm {
  id?: string;
  location_id: string;
  location_name: string;
  location_image: string;
  location_pincode: string;
  is_active: boolean;
  zones: ZoneEdit[];
}
const blankForm: LocForm = {
  location_id: '',
  location_name: '',
  location_image: '',
  location_pincode: '',
  is_active: true,
  zones: [{ zone_name: '', zone_code: '', pincode: '' }],
};

export default function LocationsPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(LOCATIONS, {
    variables: { filter: { search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LocForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...blankForm, zones: [{ zone_name: '', zone_code: '', pincode: '' }] });
    setOpError(null);
    setDialogOpen(true);
  };
  const openEdit = (loc: any) => {
    setForm({
      id: loc.id,
      location_id: loc.location_id,
      location_name: loc.location_name,
      location_image: loc.location_image,
      location_pincode: loc.location_pincode,
      is_active: loc.is_active,
      zones:
        loc.location_zones.length > 0
          ? loc.location_zones.map((z: any) => ({
              zone_name: z.zone_name,
              zone_code: z.zone_code ?? '',
              pincode: z.pincode ?? '',
            }))
          : [{ zone_name: '', zone_code: '', pincode: '' }],
    });
    setOpError(null);
    setDialogOpen(true);
  };

  const updateZone = (idx: number, patch: Partial<ZoneEdit>) => {
    setForm((p) => ({
      ...p,
      zones: p.zones.map((z, i) => (i === idx ? { ...z, ...patch } : z)),
    }));
  };
  const addZone = () =>
    setForm((p) => ({
      ...p,
      zones: [...p.zones, { zone_name: '', zone_code: '', pincode: '' }],
    }));
  const removeZone = (idx: number) =>
    setForm((p) => ({ ...p, zones: p.zones.filter((_, i) => i !== idx) }));

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      const cleanZones = form.zones
        .map((z) => ({
          zone_name: z.zone_name.trim(),
          zone_code: z.zone_code.trim() || undefined,
          pincode: z.pincode.trim() || undefined,
        }))
        .filter((z) => z.zone_name);

      if (cleanZones.length === 0) {
        throw new Error('At least one zone is required');
      }
      if (!form.location_image.trim()) throw new Error('Location image URL is required');
      if (!form.location_pincode.trim()) throw new Error('Pincode is required');

      if (form.id) {
        await updateMut({
          variables: {
            id: form.id,
            input: {
              location_name: form.location_name,
              location_image: form.location_image,
              location_pincode: form.location_pincode,
              location_zones: cleanZones,
              is_active: form.is_active,
            },
          },
        });
      } else {
        await createMut({
          variables: {
            input: {
              location_name: form.location_name,
              location_id: form.location_id || undefined,
              location_image: form.location_image,
              location_pincode: form.location_pincode,
              location_zones: cleanZones,
            },
          },
        });
      }
      setToast('Saved');
      setDialogOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc: any) => {
    if (!confirm(`Delete location "${loc.location_name}"?`)) return;
    try {
      await deleteMut({ variables: { id: loc.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      alert(e.message);
    }
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
            <LocationOnIcon color="primary" />
            <Typography variant="h5">Locations</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Cities and their zones served by the platform.
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            placeholder="Search name, ID, pincode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Location
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
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Image</TableCell>
                  <TableCell>Location</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Pincode</TableCell>
                  <TableCell>Zones</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.locations ?? []).map((loc: any) => (
                  <TableRow key={loc.id} hover>
                    <TableCell>
                      <Avatar
                        variant="rounded"
                        src={loc.location_image}
                        sx={{ width: 48, height: 48 }}
                      >
                        {loc.location_name[0]}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {loc.location_name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {loc.location_id}
                      </Typography>
                    </TableCell>
                    <TableCell>{loc.location_pincode}</TableCell>
                    <TableCell sx={{ maxWidth: 320 }}>
                      <Stack direction="row" sx={{ gap: 0.5 }} flexWrap="wrap">
                        {loc.location_zones.map((z: any, i: number) => (
                          <Chip
                            key={i}
                            size="small"
                            label={
                              z.pincode
                                ? `${z.zone_name} · ${z.pincode}`
                                : z.zone_name
                            }
                          />
                        ))}
                        {loc.location_zones.length === 0 && (
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={loc.is_active ? 'Active' : 'Inactive'}
                        color={loc.is_active ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(loc)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => remove(loc)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {data?.locations?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                          No locations yet. Click "New Location" to create one.
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{form.id ? 'Edit Location' : 'New Location'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Location name"
                value={form.location_name}
                onChange={(e) => setForm({ ...form, location_name: e.target.value })}
                fullWidth
                required
              />
              <TextField
                label="Location ID"
                value={form.location_id}
                onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                disabled={!!form.id}
                helperText={
                  form.id
                    ? 'ID cannot be changed'
                    : 'Leave blank to auto-generate from name (lowercase slug)'
                }
                fullWidth
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Pincode"
                value={form.location_pincode}
                onChange={(e) => setForm({ ...form, location_pincode: e.target.value })}
                required
                sx={{ maxWidth: 200 }}
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
            <MediaPickerField
              label="Location image URL"
              value={form.location_image}
              onChange={(url) => setForm({ ...form, location_image: url })}
              folder="/locations"
              required
            />

            <Box>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">Zones</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={addZone}>
                  Add Zone
                </Button>
              </Stack>
              <Stack spacing={1.5}>
                {form.zones.map((z, i) => (
                  <Stack
                    key={i}
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    <TextField
                      size="small"
                      label="Zone name"
                      value={z.zone_name}
                      onChange={(e) => updateZone(i, { zone_name: e.target.value })}
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      size="small"
                      label="Code"
                      value={z.zone_code}
                      onChange={(e) => updateZone(i, { zone_code: e.target.value })}
                      sx={{ width: { xs: '100%', sm: 140 } }}
                    />
                    <TextField
                      size="small"
                      label="Pincode"
                      value={z.pincode}
                      onChange={(e) => updateZone(i, { pincode: e.target.value })}
                      sx={{ width: { xs: '100%', sm: 140 } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => removeZone(i)}
                      disabled={form.zones.length === 1}
                    >
                      <RemoveCircleOutlineIcon />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            </Box>

            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={busy || !form.location_name.trim()}
          >
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
