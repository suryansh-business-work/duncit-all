import { useMemo, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Snackbar, Stack } from '@mui/material';
import {
  SLIDERS,
  LOCATIONS,
  SUPER_CATEGORIES,
  CREATE,
  UPDATE,
  DELETE,
  SliderForm,
  blankForm,
} from './queries';
import SliderFormDialog from './SliderFormDialog';
import SlidersTable from './SlidersTable';
import SlidersToolbar from './SlidersToolbar';

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
      starts_at: s.starts_at ?? '',
      ends_at: s.ends_at ?? '',
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

  return (
    <Stack spacing={3}>
      <SlidersToolbar
        scopeFilter={scopeFilter}
        setScopeFilter={setScopeFilter}
        search={search}
        setSearch={setSearch}
        onCreate={openCreate}
      />

      {error && <Alert severity="error">{error.message}</Alert>}

      <SlidersTable
        loading={loading}
        hasData={!!data}
        rows={data?.sliders ?? []}
        locations={locations}
        onEdit={openEdit}
        onRemove={remove}
      />

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
