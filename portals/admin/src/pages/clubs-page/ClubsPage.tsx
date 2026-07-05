import { useEffect, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Snackbar, Stack } from '@mui/material';
import {
  CLUBS,
  CATEGORIES,
  LOCATIONS,
  CREATE,
  UPDATE,
  DELETE,
  ClubForm,
  blankForm,
  linesToMedia,
  cleanBullets,
  cleanFaqs,
} from './queries';
import ClubFormDialog from './ClubFormDialog';
import ClubsTable from './ClubsTable';
import ClubsToolbar from './ClubsToolbar';

export default function ClubsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit') ?? '';
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(CLUBS, {
    variables: { filter: { search: search || undefined } },
    fetchPolicy: 'cache-and-network',
  });
  const { data: catData } = useQuery(CATEGORIES);
  const { data: locData } = useQuery(LOCATIONS);
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
      location_id: c.location_id ?? '',
      locality: c.locality ?? '',
      feature_text: (c.club_feature_images_and_videos ?? [])
        .map((m: any) => m.url)
        .join('\n'),
      moments_text: (c.club_moments ?? []).map((m: any) => m.url).join('\n'),
      community_link: c.club_whats_app_community_link ?? '',
      announcement_link: c.club_whats_app_announcement_link ?? '',
      group_link: c.club_whats_app_group_link ?? '',
      who_we_are: c.who_we_are ?? [],
      what_we_do: c.what_we_do ?? [],
      perks: c.perks ?? [],
      values: c.values ?? [],
      faqs: (c.faqs ?? []).map((f: any) => ({ question: f.question, answer: f.answer })),
      is_active: c.is_active,
    });
    setOpError(null);
    setOpen(true);
  };

  // Deep-link from the Club details page: /clubs?edit=<id> opens the edit dialog.
  useEffect(() => {
    if (!editId || open) return;
    const club = (data?.clubs ?? []).find((c: any) => c.id === editId);
    if (club) openEdit(club);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, data?.clubs]);

  const submit = async (options?: { draft?: boolean }) => {
    setBusy(true);
    setOpError(null);
    try {
      const isDraft = !!options?.draft;
      const payload = {
        club_name: form.club_name,
        club_description: form.club_description,
        club_feature_images_and_videos: linesToMedia(form.feature_text),
        club_moments: linesToMedia(form.moments_text),
        club_whats_app_community_link: form.community_link,
        club_whats_app_announcement_link: form.announcement_link,
        club_whats_app_group_link: form.group_link,
        who_we_are: cleanBullets(form.who_we_are),
        what_we_do: cleanBullets(form.what_we_do),
        perks: cleanBullets(form.perks),
        values: cleanBullets(form.values),
        faqs: cleanFaqs(form.faqs),
        location_id: form.location_id || null,
        locality: form.locality,
        category_id: form.category_id || null,
        super_category_id: form.super_category_id || null,
      };
      if (form.id) {
        await updateMut({
          variables: { id: form.id, input: { ...payload, is_active: form.is_active } },
        });
      } else {
        await createMut({
          variables: { input: { ...payload, club_id: form.club_id || undefined, is_active: !isDraft } },
        });
      }
      setToast(isDraft ? 'Draft saved' : 'Saved');
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

  const superCats = (catData?.categories ?? []).filter((c: any) => c.level === 'SUPER');
  const locations = locData?.locations ?? [];
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
        onView={(c) => navigate(`/clubs/${c.id}`)}
      />

      <ClubFormDialog
        open={open}
        form={form}
        setForm={setForm}
        onClose={() => setOpen(false)}
        onSubmit={submit}
        onSaveDraft={() => submit({ draft: true })}
        busy={busy}
        opError={opError}
        superCats={superCats}
        allCats={allCats}
        locations={locations}
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
