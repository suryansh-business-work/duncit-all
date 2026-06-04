import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { CRM_CALL_PROMPTS, DELETE_CRM_CALL_PROMPT, type CrmCallPrompt } from '../../api/call.gql';
import { parseApiError } from '../../utils/parseApiError';
import ConfirmDialog from '../../components/ConfirmDialog';
import CallPromptsTable from './CallPromptsTable';
import CallPromptDialog from './CallPromptDialog';

/**
 * AI Call Prompts → Static Content. Operators curate reusable context blocks
 * the AI agent speaks in during an "AI Call". CRUD over GraphQL, MUI dialogs
 * for add/edit and delete confirmation (no native alert/confirm).
 */
export default function CallPromptsPage() {
  const { data, loading, error, refetch } = useQuery<{ crmCallPrompts: CrmCallPrompt[] }>(CRM_CALL_PROMPTS, {
    fetchPolicy: 'cache-and-network',
  });
  const [editing, setEditing] = useState<CrmCallPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<CrmCallPrompt | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation(DELETE_CRM_CALL_PROMPT);

  const prompts = data?.crmCallPrompts ?? [];

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
    refetch();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} flexWrap="wrap" useFlexGap>
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
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          Add Static Content
        </Button>
      </Stack>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}

      <Card>
        <CardContent>
          {loading && !prompts.length ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          ) : prompts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No Static Content yet. Click "Add Static Content" to create your first AI Call prompt.
            </Typography>
          ) : (
            <CallPromptsTable prompts={prompts} onEdit={openEdit} onDelete={setToDelete} />
          )}
        </CardContent>
      </Card>

      <CallPromptDialog
        open={dialogOpen}
        prompt={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={() => refetch()}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Static Content"
        message={`Delete "${toDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
