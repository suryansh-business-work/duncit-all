import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useApolloTableFetch } from '@duncit/table';
import { CRM_CALL_PROMPTS_TABLE, DELETE_CRM_CALL_PROMPT, type CrmCallPrompt } from '../../api/call.gql';
import { ConfirmDialog } from '@duncit/dialogs';
import CallPromptsTable from './CallPromptsTable';
import CallPromptDialog from './CallPromptDialog';

/**
 * AI Call Prompts → Static Content. Operators curate reusable context blocks
 * the AI agent speaks in during an "AI Call". CRUD over GraphQL, MUI dialogs
 * for add/edit and delete confirmation (no native alert/confirm).
 */
export default function CallPromptsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [editing, setEditing] = useState<CrmCallPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CrmCallPrompt | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation(DELETE_CRM_CALL_PROMPT);

  const fetchRows = useApolloTableFetch<CrmCallPrompt>(client, CRM_CALL_PROMPTS_TABLE, 'crmCallPromptsTable');

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (prompt: CrmCallPrompt) => {
    setEditing(prompt);
    setDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (!toDelete) return;
    await deletePrompt({ variables: { id: toDelete.id } });
    setToDelete(null);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <Box>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SmartToyIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>
            Static Content
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Reusable context blocks the AI agent speaks in during an AI Call.
        </Typography>
      </Box>

      <CallPromptsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
            Add Static Content
          </Button>
        }
        onEdit={openEdit}
        onDelete={setToDelete}
      />

      <CallPromptDialog
        open={dialogOpen}
        prompt={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => refetchRef.current?.()}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Static Content"
        message={`Delete "${toDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
