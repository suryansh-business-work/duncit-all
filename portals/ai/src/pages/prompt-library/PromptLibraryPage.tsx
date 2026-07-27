import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import type { TableQueryState } from '@duncit/table';
import { AI_PROMPTS, DELETE_AI_PROMPT, RESET_AI_PROMPT, type AiPrompt } from './queries';
import { applyPromptTableState } from './promptTableRows';
import { parseApiError } from '@duncit/utils';
import { ConfirmDialog } from '@duncit/dialogs';
import PromptsTable from './PromptsTable';
import PromptDialog from './PromptDialog';

/**
 * AI Library → Prompt Library. Every AI feature on the platform (image-upload
 * scan, dummy-data generation, moderation, support chat…) runs on a "System"
 * row here — the server reads the live body on each call, so editing it here
 * changes the feature. System rows are seeded by the server and cannot be
 * deleted; "Reset" restores their shipped default. Operators can also add their
 * own reusable prompts. CRUD over GraphQL with MUI dialogs (no native confirm).
 */
export default function PromptLibraryPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<AiPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiPrompt | null>(null);
  const [toReset, setToReset] = useState<AiPrompt | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation(DELETE_AI_PROMPT);
  const [resetPrompt, { loading: resetting }] = useMutation(RESET_AI_PROMPT);

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
  const confirmReset = async () => {
    /* v8 ignore next -- defensive guard: ConfirmDialog onConfirm only fires while toReset is set */
    if (!toReset) return;
    setDeleteError(null);
    try {
      await resetPrompt({ variables: { id: toReset.id } });
      refetchRef.current?.();
    } catch (err) {
      setDeleteError(parseApiError(err));
    } finally {
      setToReset(null);
    }
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
          Every AI feature reads its prompt from here. &quot;System&quot; prompts run the shipped
          features — edit them to change how the app behaves; they cannot be deleted.
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
        onReset={setToReset}
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
      <ConfirmDialog
        open={!!toReset}
        title="Reset prompt"
        message={`Restore the shipped default for "${toReset?.name ?? ''}"? Your edits to this prompt will be lost.`}
        confirmLabel="Reset"
        loading={resetting}
        busyLabel="Working…"
        onConfirm={confirmReset}
        onClose={() => setToReset(null)}
      />
    </Stack>
  );
}
