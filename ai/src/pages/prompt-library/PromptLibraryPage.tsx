import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SearchIcon from '@mui/icons-material/Search';
import { AI_PROMPTS, DELETE_AI_PROMPT, type AiPrompt } from './queries';
import { parseApiError } from '../../utils/parseApiError';
import ConfirmDialog from '../../components/ConfirmDialog';
import PromptsTable from './PromptsTable';
import PromptDialog from './PromptDialog';

/**
 * AI Library → Prompt Library. Operators curate reusable AI prompts; each row
 * shows the prompt's estimated token size (derived from its content). CRUD over
 * GraphQL with MUI dialogs for add/edit and delete (no native alert/confirm).
 */
export default function PromptLibraryPage() {
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery<{ aiPrompts: AiPrompt[] }>(AI_PROMPTS, {
    variables: { filter: { search: search.trim() || null } },
    fetchPolicy: 'cache-and-network',
  });
  const [editing, setEditing] = useState<AiPrompt | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toDelete, setToDelete] = useState<AiPrompt | null>(null);
  const [deletePrompt, { loading: deleting }] = useMutation(DELETE_AI_PROMPT);

  const prompts = data?.aiPrompts ?? [];

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (prompt: AiPrompt) => {
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
            <AutoStoriesIcon color="primary" />
            <Typography variant="h5" fontWeight={800}>
              Prompt Library
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Reusable AI prompts with their estimated token size.
          </Typography>
        </Box>
        <Button startIcon={<AddIcon />} variant="contained" onClick={openCreate}>
          Add prompt
        </Button>
      </Stack>

      <TextField
        size="small"
        placeholder="Search by name, category or content…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{ maxWidth: 420 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" />
            </InputAdornment>
          ),
        }}
      />

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}

      <Card>
        <CardContent>
          {loading && prompts.length === 0 && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress />
            </Stack>
          )}
          {!loading && prompts.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              {search ? 'No prompts match your search.' : 'No prompts yet. Click "Add prompt" to create your first one.'}
            </Typography>
          )}
          {prompts.length > 0 && <PromptsTable prompts={prompts} onEdit={openEdit} onDelete={setToDelete} />}
        </CardContent>
      </Card>

      <PromptDialog open={dialogOpen} prompt={editing} onClose={() => setDialogOpen(false)} onSaved={() => refetch()} />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete prompt"
        message={`Delete "${toDelete?.name ?? ''}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
