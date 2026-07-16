import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Button, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog, notifySuccess } from '@duncit/dialogs';
import { PageHeader } from '@duncit/ui';
import { CREATE_POLICY, DELETE_POLICY, POLICIES_TABLE, UPDATE_POLICY, type Policy } from '../../graphql/policies';
import { slugify } from '../../lib/slug';
import PoliciesTable from './PoliciesTable';
import PolicyFormDialog, { EMPTY_POLICY_FORM, type PolicyFormState } from './PolicyFormDialog';

export default function PoliciesPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);

  const fetchRows = useApolloTableFetch<Policy>(client, POLICIES_TABLE, 'policiesTable');

  const [editing, setEditing] = useState<Policy | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<PolicyFormState>(EMPTY_POLICY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [delTarget, setDelTarget] = useState<Policy | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [createMut, { loading: creating }] = useMutation(CREATE_POLICY);
  const [updateMut, { loading: updating }] = useMutation(UPDATE_POLICY);
  const [deleteMut] = useMutation(DELETE_POLICY);
  const saving = creating || updating;

  const openNew = () => {
    setIsNew(true);
    setEditing({ id: '', slug: '', title: '', content: '', is_active: true, sort_order: 0, updated_at: '' });
    setForm({ ...EMPTY_POLICY_FORM });
    setSlugTouched(false);
    setError(null);
  };
  const openEdit = (p: Policy) => {
    setIsNew(false);
    setEditing(p);
    setForm({ slug: p.slug, title: p.title, content: p.content || '', is_active: p.is_active, sort_order: p.sort_order });
    setSlugTouched(true);
    setError(null);
  };

  const onTitle = (title: string) => {
    setForm((f) => ({ ...f, title, slug: isNew && !slugTouched ? slugify(title) : f.slug }));
  };

  const onFormChange = (patch: Partial<PolicyFormState>) => {
    if (patch.slug !== undefined) setSlugTouched(true);
    setForm((f) => ({ ...f, ...patch }));
  };

  const submit = async () => {
    setError(null);
    if (!form.title.trim()) return setError('Title is required');
    const slug = slugify(form.slug || form.title);
    if (!slug) return setError('Slug is required');
    const input = {
      slug,
      title: form.title.trim(),
      content: form.content,
      is_active: form.is_active,
      sort_order: Number(form.sort_order) || 0,
    };
    try {
      if (isNew) {
        await createMut({ variables: { input } });
        notifySuccess('Policy created');
      } else {
        await updateMut({ variables: { id: editing!.id, input } });
        notifySuccess('Policy updated');
      }
      setEditing(null);
      refetchRef.current?.();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const doDelete = async () => {
    /* v8 ignore next -- the confirm dialog only opens once a target is set */
    if (!delTarget) return;
    await deleteMut({ variables: { id: delTarget.id } });
    notifySuccess('Policy deleted');
    setDelTarget(null);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2}>
      <PageHeader title="Policies" subtitle="Website & app policies — managed in one place." />

      <PoliciesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onEdit={openEdit}
        onRemove={setDelTarget}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            New Policy
          </Button>
        }
      />

      <PolicyFormDialog
        open={!!editing}
        isNew={isNew}
        editingTitle={editing?.title ?? ''}
        form={form}
        error={error}
        saving={saving}
        onTitle={onTitle}
        onChange={onFormChange}
        onClose={() => setEditing(null)}
        onSubmit={submit}
      />

      <ConfirmDialog
        open={!!delTarget}
        title="Delete policy?"
        message={`This permanently deletes “${delTarget?.title}”.`}
        confirmLabel="Delete"
        destructive
        onConfirm={doDelete}
        onClose={() => setDelTarget(null)}
      />
    </Stack>
  );
}
