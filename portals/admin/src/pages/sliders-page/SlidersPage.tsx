import { useCallback, useRef, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { LOCATIONS, SUPER_CATEGORIES, CREATE, UPDATE, DELETE, SliderForm, blankForm } from './queries';
import { SLIDERS_TABLE, type SliderRow } from './table.queries';
import { toCreateSliderInput, toUpdateSliderInput } from './slider.form';
import SliderFormDialog from './SliderFormDialog';
import SlidersTable from './SlidersTable';
import SlidersToolbar from './SlidersToolbar';

export default function SlidersPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const { data: locsData } = useQuery(LOCATIONS);
  const { data: superCatData } = useQuery(SUPER_CATEGORIES);

  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<SliderForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const locations = locsData?.locations ?? [];
  const superCategories = superCatData?.categories ?? [];

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: SLIDERS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.slidersTable.rows as SliderRow[], total: data.slidersTable.total as number };
    },
    [client],
  );

  const openCreate = () => {
    setForm(blankForm);
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (s: SliderRow) => {
    setForm({
      id: s.id,
      slider_id: s.slider_id,
      title: s.title,
      description: s.description ?? '',
      media_url: s.media_url,
      media_type: s.media_type as SliderForm['media_type'],
      link_type: (s.link_type ?? 'EXTERNAL') as SliderForm['link_type'],
      link_target_kind: (s.link_target_kind ?? '') as SliderForm['link_target_kind'],
      link_target_id: s.link_target_id ?? '',
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

  const submit = async (values: SliderForm) => {
    setBusy(true);
    setOpError(null);
    try {
      if (values.id) {
        await updateMut({
          variables: { id: values.id, input: toUpdateSliderInput(values) },
        });
      } else {
        await createMut({
          variables: { input: toCreateSliderInput(values) },
        });
      }
      setToast('Saved');
      setOpen(false);
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (s: SliderRow) => {
    const ok = await confirm({
      title: 'Delete slider',
      message: `Delete slider "${s.title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: s.id } });
      setToast('Deleted');
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <SlidersToolbar />

      <SlidersTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        locations={locations}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Slider
          </Button>
        }
        onEdit={openEdit}
        onRemove={remove}
      />

      <SliderFormDialog
        open={open}
        onClose={() => setOpen(false)}
        form={form}
        busy={busy}
        opError={opError}
        onSubmit={submit}
        locations={locations}
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
