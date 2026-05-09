import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Snackbar, Stack } from '@mui/material';
import { notifyError } from '../../components/notify';
import {
  CREATE_LOCATION,
  DELETE_LOCATION,
  LOCATIONS,
  UPDATE_LOCATION,
} from './queries';
import { blankForm, type LocForm, type ZoneEdit } from './types';
import LocationsTable from './LocationsTable';
import LocationFormDialog from './LocationFormDialog';
import LocationsToolbar from './LocationsToolbar';

export default function LocationsPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(LOCATIONS, {
    variables: { filter: { search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const [createMut] = useMutation(CREATE_LOCATION);
  const [updateMut] = useMutation(UPDATE_LOCATION);
  const [deleteMut] = useMutation(DELETE_LOCATION);

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

      if (cleanZones.length === 0) throw new Error('At least one zone is required');
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
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <LocationsToolbar search={search} setSearch={setSearch} onCreate={openCreate} />

      {error && <Alert severity="error">{error.message}</Alert>}

      <LocationsTable
        loading={loading}
        hasData={!!data}
        locations={data?.locations ?? []}
        onEdit={openEdit}
        onDelete={remove}
      />

      <LocationFormDialog
        open={dialogOpen}
        form={form}
        setForm={setForm}
        busy={busy}
        opError={opError}
        onClose={() => setDialogOpen(false)}
        onSubmit={submit}
        updateZone={updateZone}
        addZone={addZone}
        removeZone={removeZone}
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
