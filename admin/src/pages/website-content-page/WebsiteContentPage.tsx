import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Snackbar, Stack } from '@mui/material';
import WebsiteContentDialog from './WebsiteContentDialog';
import WebsiteContentTable from './WebsiteContentTable';
import WebsiteContentToolbar from './WebsiteContentToolbar';
import { useConfirm } from '../../components/useConfirm';
import { websiteContentSchema } from './validation';
import {
  CREATE_CONTENT,
  DELETE_CONTENT,
  UPDATE_CONTENT,
  WEBSITE_CONTENT,
  blankContentForm,
  toContentForm,
  toContentInput,
  type WebsiteContentForm,
  type WebsitePageType,
} from './queries';

export default function WebsiteContentPage() {
  const [activeType, setActiveType] = useState<WebsitePageType>('BLOG');
  const { data, loading, error, refetch } = useQuery(WEBSITE_CONTENT, {
    variables: { type: activeType },
    fetchPolicy: 'cache-and-network',
  });
  const [createContent] = useMutation(CREATE_CONTENT);
  const [updateContent] = useMutation(UPDATE_CONTENT);
  const [deleteContent] = useMutation(DELETE_CONTENT);
  const confirm = useConfirm();
  const [form, setForm] = useState<WebsiteContentForm>(blankContentForm(activeType));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setForm(blankContentForm(activeType));
    setOpError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setForm(toContentForm(item));
    setOpError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await websiteContentSchema.validate(form, { abortEarly: false });
      const input = toContentInput(form);
      if (form.id) await updateContent({ variables: { id: form.id, input } });
      else await createContent({ variables: { input } });
      setDialogOpen(false);
      setToast('Website content saved');
      await refetch();
    } catch (saveError: any) {
      const message = saveError?.errors?.join(', ') || saveError.message || 'Failed to save';
      setOpError(message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: any) => {
    const ok = await confirm({
      title: 'Delete content',
      message: `Delete "${item.title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteContent({ variables: { id: item.id } });
    setToast('Website content deleted');
    await refetch();
  };

  return (
    <Stack spacing={3}>
      <WebsiteContentToolbar
        activeType={activeType}
        onTypeChange={setActiveType}
        onCreate={openCreate}
      />
      {error && <Alert severity="error">{error.message}</Alert>}
      <WebsiteContentTable
        items={data?.websiteContent ?? []}
        loading={loading}
        onEdit={openEdit}
        onDelete={remove}
      />
      <WebsiteContentDialog
        open={dialogOpen}
        form={form}
        error={opError}
        busy={busy}
        onClose={() => setDialogOpen(false)}
        onChange={setForm}
        onSave={save}
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