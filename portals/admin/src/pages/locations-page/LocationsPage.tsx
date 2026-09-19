import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VideoSettingsIcon from '@mui/icons-material/VideoSettings';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useConfirm, notifyError } from '@duncit/dialogs';
import {
  CREATE_LOCATION,
  DELETE_LOCATION,
  LOCATIONS_TABLE,
  UPDATE_LOCATION,
  type LocationRow,
} from './queries';
import { blankForm, buildLocationInput, toLaunchMediaInput, type LocForm, type ZoneEdit } from './types';
import LocationsTable from './LocationsTable';
import LocationFormDialog from './LocationFormDialog';
import LaunchMediaDialog from './LaunchMediaDialog';
import LocationsToolbar from './LocationsToolbar';
import { withLaunchFilter } from './launchFilter';
import { useTranslation } from '@duncit/shell';

export default function LocationsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createMut] = useMutation<any>(CREATE_LOCATION);
  const [updateMut] = useMutation<any>(UPDATE_LOCATION);
  const [deleteMut] = useMutation<any>(DELETE_LOCATION);
  const confirm = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [form, setForm] = useState<LocForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchPage = useApolloTableFetch<LocationRow>(client, LOCATIONS_TABLE, 'locationsTable');
  const fetchRows = useMemo(() => withLaunchFilter(fetchPage), [fetchPage]);

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
      country: loc.country,
      country_code: loc.country_code,
      state: loc.state,
      state_code: loc.state_code,
      city: loc.city,
      location_image: loc.location_image,
      location_pincode: '',
      is_active: loc.is_active,
      is_launched: loc.is_launched,
      launch_target: String(loc.launch_target),
      whatsapp_group_url: loc.whatsapp_group_url,
      // Picked by name at hydration, so form state never carries __typename.
      launch_media: toLaunchMediaInput(loc.launch_media),
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
      setToast(t('shell.common.saved'));
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
      title: t('admin.locations.deleteLocation'),
      message: `Delete location "${loc.location_name}"?`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: loc.id } });
      setToast(t('shell.common.deleted'));
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
          <Stack direction="row" spacing={1}>
            <DuncitButton
              size="small"
              variant="outlined"
              startIcon={<VideoSettingsIcon />}
              onClick={() => setMediaOpen(true)}
              data-testid="locations-launch-media"
            >
              {t('admin.locations.launchMedia')}
            </DuncitButton>
            <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              New Location
            </DuncitButton>
          </Stack>
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

      <LaunchMediaDialog
        open={mediaOpen}
        onClose={() => setMediaOpen(false)}
        onSaved={() => setToast(t('shell.common.saved'))}
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
