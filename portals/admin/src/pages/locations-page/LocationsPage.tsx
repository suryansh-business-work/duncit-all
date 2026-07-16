import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useConfirm, notifyError } from '@duncit/dialogs';
import {
  CREATE_LOCATION,
  DELETE_LOCATION,
  LOCATIONS_TABLE,
  UPDATE_LOCATION,
  type LocationRow,
} from './queries';
import { blankForm, buildLocationInput, type LocForm, type ZoneEdit } from './types';
import LocationsTable from './LocationsTable';
import LocationFormDialog from './LocationFormDialog';
import LocationsToolbar from './LocationsToolbar';

export default function LocationsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createMut] = useMutation(CREATE_LOCATION);
  const [updateMut] = useMutation(UPDATE_LOCATION);
  const [deleteMut] = useMutation(DELETE_LOCATION);
  const confirm = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<LocForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: LOCATIONS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.locationsTable.rows as LocationRow[], total: data.locationsTable.total as number };
    },
    [client],
  );

  const openCreate = () => {
    setForm({ ...blankForm, zones: [{ zone_name: '', zone_code: '', pincode: '' }] });
    setOpError(null);
    setDialogOpen(true);
  };

  const openEdit = (loc: LocationRow) => {
    setForm({
      id: loc.id,
      location_id: '',
      location_name: loc.location_name,
      country: loc.country ?? 'India',
      country_code: loc.country_code ?? 'IN',
      state: loc.state ?? '',
      state_code: loc.state_code ?? '',
      city: loc.city ?? loc.location_name ?? '',
      location_image: loc.location_image ?? '',
      location_pincode: '',
      is_active: loc.is_active,
      zones:
        loc.location_zones.length > 0
          ? loc.location_zones.map((z) => ({
              zone_name: z.zone_name,
              zone_code: '',
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
      const input = buildLocationInput(form);
      if (form.id) {
        await updateMut({ variables: { id: form.id, input: { ...input, is_active: form.is_active } } });
      } else {
        await createMut({ variables: { input } });
      }
      setToast('Saved');
      setDialogOpen(false);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (loc: LocationRow) => {
    const ok = await confirm({
      title: 'Delete location',
      message: `Delete location "${loc.location_name}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: loc.id } });
      setToast('Deleted');
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <LocationsToolbar />

      <LocationsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Location
          </Button>
        }
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
