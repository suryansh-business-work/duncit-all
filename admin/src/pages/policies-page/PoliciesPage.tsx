import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, Button, Snackbar, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import {
  CREATE_POLICY,
  DELETE_POLICY,
  POLICIES,
  UPDATE_POLICY,
} from './queries';
import { emptyForm, type FormState, slugify } from './helpers';
import PoliciesTable from './PoliciesTable';
import PolicyEditDialog from './PolicyEditDialog';
import PolicyDeleteDialog from './PolicyDeleteDialog';

export default function PoliciesPage() {
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<any | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [search]);

  const { data, loading, refetch } = useQuery(POLICIES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const items: any[] = data?.policies ?? [];

  const [createMut, { loading: creating }] = useMutation(CREATE_POLICY);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_POLICY);
  const [deleteMut] = useMutation(DELETE_POLICY);
  const saving = creating || updating;

  useEffect(() => {
    if (editing && !editing.id && !slugTouched) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, editing, slugTouched]);

  const openNew = () => {
    setEditing({});
    setForm({ ...emptyForm });
    setSlugTouched(false);
    setError(null);
  };

  const openEdit = (it: any) => {
    setEditing(it);
    setForm({
      slug: it.slug,
      title: it.title,
      content: it.content || '',
      is_active: it.is_active,
      sort_order: it.sort_order,
    });
    setSlugTouched(true);
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) {
      setError('Title is required');
      return;
    }
    const slug = slugify(form.slug || form.title);
    if (!slug) {
      setError('Slug is required');
      return;
    }
    try {
      const input = {
        slug,
        title: form.title.trim(),
        content: form.content,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editing && editing.id) {
        await updateMut({ variables: { id: editing.id, input } });
        setToast('Policy updated');
      } else {
        await createMut({ variables: { input } });
        setToast('Policy created');
      }
      setEditing(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      await refetch();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const copySlug = async (slug: string) => {
    try {
      await navigator.clipboard.writeText(slug);
      setToast(`Copied "${slug}"`);
    } catch {
      setToast('Could not copy');
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <DescriptionIcon color="primary" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Policies
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          New Policy
        </Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
          placeholder="Title or slug"
        />
      </Stack>

      <PoliciesTable
        loading={loading}
        hasData={!!data}
        items={items}
        onEdit={openEdit}
        onDelete={setDelTarget}
        onCopySlug={copySlug}
      />

      <PolicyEditDialog
        editing={editing}
        form={form}
        setForm={setForm}
        saving={saving}
        error={error}
        setSlugTouched={setSlugTouched}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />

      <PolicyDeleteDialog
        target={delTarget}
        error={error}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  );
}
