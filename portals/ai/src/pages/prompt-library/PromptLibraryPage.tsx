import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import type { TableQueryState } from '@duncit/table';
import { AI_PROMPTS, DELETE_AI_PROMPT, type AiPrompt } from './queries';
import { applyPromptTableState } from './promptTableRows';
import { parseApiError } from '@duncit/utils';
import { ConfirmDialog } from '@duncit/dialogs';
import PromptsTable from './PromptsTable';
import PromptDialog from './PromptDialog';

/**
 * AI Library → Prompt Library. Operators curate reusable AI prompts; each row
 * shows the prompt's estimated token size (derived from its content). CRUD over
 * GraphQL with MUI dialogs for add/edit and delete (no native alert/confirm).
 */
export default function PromptLibraryPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<AiPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiPrompt | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation(DELETE_AI_PROMPT);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query<{ aiPrompts: AiPrompt[] }>({
        query: AI_PROMPTS,
        variables: { filter: { search: q.search.trim() || null } },
        fetchPolicy: 'network-only',
      });
      return applyPromptTableState(data.aiPrompts, q);
    },
    [client],
  );

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (prompt: AiPrompt) => {
    setEditing(prompt);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    /* v8 ignore next -- defensive guard: ConfirmDialog onConfirm only fires while toDelete is set */
    if (!toDelete) return;
    setDeleteError(null);
    try {
      await deletePrompt({ variables: { id: toDelete.id } });
      refetchRef.current?.();
    } catch (err) {
      setDeleteError(parseApiError(err));
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AutoStoriesIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Prompt Library
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Reusable AI prompts with their estimated token size.
        </Typography>
      </Box>

      {deleteError && (
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}

      <PromptsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            Add prompt
          </Button>
        }
        onEdit={openEdit}
        onDelete={setToDelete}
      />

      <PromptDialog
        open={dialogOpen}
        prompt={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => refetchRef.current?.()}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete prompt"
        message={`Delete "${toDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        busyLabel="Working…"
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
