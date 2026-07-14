import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { useConfirm } from '../../../components/useConfirm';
import { parseApiError } from '../../../utils/parseApiError';
import ContentTable from './ContentTable';
import ContentDialog from './ContentDialog';
import {
  CONTENT_LABELS,
  CONTENT_TABLE,
  CREATE_CONTENT,
  DELETE_CONTENT,
  UPDATE_CONTENT,
  type WebsiteContentItem,
  type WebsitePageType,
} from './queries';
import type { WebsiteContentInput } from './website-content';

/** Reusable content manager bound to a single website page type. */
export default function ContentManager({ type }: Readonly<{ type: WebsitePageType }>) {
  const labels = CONTENT_LABELS[type];
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createContent] = useMutation(CREATE_CONTENT);
  const [updateContent] = useMutation(UPDATE_CONTENT);
  const [deleteContent] = useMutation(DELETE_CONTENT);
  const confirm = useConfirm();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WebsiteContentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      // Scope the shared websiteContentTable query to this page's type.
      const scoped: TableQueryState = {
        ...q,
        filters: [...q.filters, { field: 'type', op: 'eq', value: type }],
      };
      const { data } = await client.query({
        query: CONTENT_TABLE,
        variables: tableQueryToGql(scoped),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.websiteContentTable.rows as WebsiteContentItem[],
        total: data.websiteContentTable.total as number,
      };
    },
    [client, type],
  );

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
      refetchRef.current?.();
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
      refetchRef.current?.();
    } catch (deleteError) {
      setToast(parseApiError(deleteError));
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          {labels.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {labels.description}
        </Typography>
      </Box>
      <ContentTable
        tableId={`website-content-${type.toLowerCase()}`}
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New entry
          </Button>
        }
        onEdit={openEdit}
        onDelete={remove}
      />
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
