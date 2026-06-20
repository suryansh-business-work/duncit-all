import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {
  CHALLENGES,
  CHALLENGE_STATS,
  DELETE_CHALLENGE,
  type Challenge,
} from '../../graphql/challenges';
import ChallengesTable from './ChallengesTable';
import ChallengeFormDialog from './ChallengeFormDialog';

export default function ChallengesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [deleting, setDeleting] = useState<Challenge | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error } = useQuery(CHALLENGES, {
    variables: { search: search || null },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteChallenge, deleteState] = useMutation(DELETE_CHALLENGE, {
    refetchQueries: [{ query: CHALLENGES, variables: { search: null } }, { query: CHALLENGE_STATS }],
  });

  const rows: Challenge[] = data?.challenges ?? [];

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (challenge: Challenge) => {
    setEditing(challenge);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    if (!deleting) return;
    await deleteChallenge({ variables: { id: deleting.id } });
    setDeleting(null);
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <EmojiEventsIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>Challenges</Typography>
        </Stack>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
          New challenge
        </Button>
      </Stack>

      <TextField
        size="small"
        fullWidth
        placeholder="Search challenges by name…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {error && <Alert severity="error">{error.message}</Alert>}
      {loading && rows.length === 0 ? (
        <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
      ) : rows.length === 0 ? (
        <Alert severity="info">No challenges yet. Create one with “New challenge”.</Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <ChallengesTable rows={rows} onEdit={openEdit} onDelete={setDeleting} />
        </Paper>
      )}

      <ChallengeFormDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} />

      <Dialog open={!!deleting} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete challenge?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Permanently delete “{deleting?.name}”. This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={deleteState.loading}>Cancel</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleteState.loading}>
            {deleteState.loading ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
