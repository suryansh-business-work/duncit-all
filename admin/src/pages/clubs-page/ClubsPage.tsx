import { useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Snackbar, Stack } from '@mui/material';
import {
  CLUBS,
  CATEGORIES,
  APPROVED_VENUES,
  CREATE,
  UPDATE,
  DELETE,
  ClubForm,
  blankForm,
  linesToMedia,
} from './queries';
import ClubFormDialog from './ClubFormDialog';
import ClubsTable from './ClubsTable';
import ClubsToolbar from './ClubsToolbar';

export default function ClubsPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(CLUBS, {
    variables: { filter: { search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: catData } = useQuery(CATEGORIES);
  const { data: venuesData } = useQuery(APPROVED_VENUES);
  const [createMut] = useMutation(CREATE);
  const [updateMut] = useMutation(UPDATE);
  const [deleteMut] = useMutation(DELETE);
  const confirm = useConfirm();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ClubForm>(blankForm);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setForm({ ...blankForm });
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (c: any) => {
    setForm({
      id: c.id,
      club_id: c.club_id,
      club_name: c.club_name,
      club_description: c.club_description ?? '',
      category_id: c.category_id ?? '',
      super_category_id: c.super_category_id ?? '',
      feature_text: (c.club_feature_images_and_videos ?? [])
        .map((m: any) => m.url)
        .join('\n'),
      moments_text: (c.club_moments ?? []).map((m: any) => m.url).join('\n'),
      meetup_venues_id: c.meetup_venues_id ?? [],
      community_link: c.club_whats_app_community_link ?? '',
      announcement_link: c.club_whats_app_announcement_link ?? '',
      group_link: c.club_whats_app_group_link ?? '',
      is_active: c.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      const payload = {
        club_name: form.club_name,
        club_description: form.club_description,
        club_feature_images_and_videos: linesToMedia(form.feature_text),
        club_moments: linesToMedia(form.moments_text),
        club_whats_app_community_link: form.community_link,
        club_whats_app_announcement_link: form.announcement_link,
        club_whats_app_group_link: form.group_link,
        meetup_venues_id: form.meetup_venues_id,
        category_id: form.category_id || null,
        super_category_id: form.super_category_id || null,
      };
      if (form.id) {
        await updateMut({
          variables: { id: form.id, input: { ...payload, is_active: form.is_active } },
        });
      } else {
        await createMut({
          variables: { input: { ...payload, club_id: form.club_id || undefined } },
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

  const remove = async (c: any) => {
    const ok = await confirm({
      title: 'Delete club',
      message: `Delete club "${c.club_name}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteMut({ variables: { id: c.id } });
      setToast('Deleted');
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const subCats = (catData?.categories ?? []).filter((c: any) => c.level === 'SUB');
  const superCats = (catData?.categories ?? []).filter((c: any) => c.level === 'SUPER');
  const venues = venuesData?.venues ?? [];
  const allCats = catData?.categories ?? [];
  const catName = (id: string) => allCats.find((c: any) => c.id === id)?.name ?? '—';

  return (
    <Stack spacing={3}>
      <ClubsToolbar search={search} setSearch={setSearch} onCreate={openCreate} />

      {error && <Alert severity="error">{error.message}</Alert>}

      <ClubsTable
        loading={loading}
        hasData={!!data}
        clubs={data?.clubs ?? []}
        catName={catName}
        onCreate={openCreate}
        onEdit={openEdit}
        onRemove={remove}
      />

      <ClubFormDialog
        open={open}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        busy={busy}
        opError={opError}
        superCats={superCats}
        subCats={subCats}
        venues={venues}
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
