import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useConfirm } from '../../../components/useConfirm';
import { parseApiError } from '../../../utils/parseApiError';
import ContentTable from './ContentTable';
import ContentDialog from './ContentDialog';
import {
  CONTENT_LABELS,
  CREATE_CONTENT,
  DELETE_CONTENT,
  UPDATE_CONTENT,
  WEBSITE_CONTENT,
  type WebsiteContentItem,
  type WebsitePageType,
} from './queries';
import type { WebsiteContentInput } from './website-content';

/** Reusable content manager bound to a single website page type. */
export default function ContentManager({ type }: Readonly<{ type: WebsitePageType }>) {
  const labels = CONTENT_LABELS[type];
  const { data, loading, error, refetch } = useQuery(WEBSITE_CONTENT, {
    variables: { type },
    fetchPolicy: 'cache-and-network',
  });
  const [createContent] = useMutation(CREATE_CONTENT);
  const [updateContent] = useMutation(UPDATE_CONTENT);
  const [deleteContent] = useMutation(DELETE_CONTENT);
  const confirm = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteContentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (item: WebsiteContentItem) => {
    setEditing(item);
    setFormError(null);
    setDialogOpen(true);
  };

  const save = async (input: WebsiteContentInput) => {
    setSubmitting(true);
    setFormError(null);
    try {
      if (editing) await updateContent({ variables: { id: editing.id, input } });
      else await createContent({ variables: { input } });
      setDialogOpen(false);
      setToast(`${labels.title} entry saved`);
      await refetch();
    } catch (saveError) {
      setFormError(parseApiError(saveError));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: WebsiteContentItem) => {
    const ok = await confirm({
      title: 'Delete entry',
      message: `Delete "${item.title}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteContent({ variables: { id: item.id } });
      setToast(`${labels.title} entry deleted`);
      await refetch();
    } catch (deleteError) {
      setToast(parseApiError(deleteError));
    }
  };

  const items: WebsiteContentItem[] = data?.websiteContent ?? [];

  return (
    <Stack spacing={3}>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {labels.title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {labels.description}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New entry
        </Button>
      </Stack>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      <ContentTable items={items} loading={loading} onEdit={openEdit} onDelete={remove} />
      <ContentDialog
        open={dialogOpen}
        type={type}
        item={editing}
        submitting={submitting}
        errorMessage={formError}
        onClose={() => setDialogOpen(false)}
        onSubmit={save}
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
