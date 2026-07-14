import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import {
  CHALLENGES_TABLE,
  CHALLENGE_STATS,
  DELETE_CHALLENGE,
  type Challenge,
} from '../../graphql/challenges';
import ChallengesTable from './ChallengesTable';
import ChallengeFormDialog from './ChallengeFormDialog';

export default function ChallengesPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [deleting, setDeleting] = useState<Challenge | null>(null);

  const [deleteChallenge, deleteState] = useMutation(DELETE_CHALLENGE, {
    refetchQueries: [{ query: CHALLENGE_STATS }],
  });

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: CHALLENGES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.challengesTable.rows as Challenge[],
        total: data.challengesTable.total as number,
      };
    },
    [client],
  );

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
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <EmojiEventsIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>Challenges</Typography>
      </Stack>

      <ChallengesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            New challenge
          </Button>
        }
        onEdit={openEdit}
        onDelete={setDeleting}
      />

      <ChallengeFormDialog
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => refetchRef.current?.()}
      />

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
