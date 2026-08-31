import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import {
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
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { useApolloTableFetch } from '@duncit/table';
import {
  CHALLENGES_TABLE,
  CHALLENGE_STATS,
  DELETE_CHALLENGE,
  type Challenge,
} from '../../graphql/challenges';
import ChallengesTable from './ChallengesTable';
import ChallengeFormDialog from './ChallengeFormDialog';

export default function ChallengesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Challenge | null>(null);
  const [deleting, setDeleting] = useState<Challenge | null>(null);

  const [deleteChallenge, deleteState] = useMutation<any>(DELETE_CHALLENGE, {
    refetchQueries: [{ query: CHALLENGE_STATS }],
  });

  const fetchRows = useApolloTableFetch<Challenge>(client, CHALLENGES_TABLE, 'challengesTable');

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (challenge: Challenge) => {
    setEditing(challenge);
    setFormOpen(true);
  };
  const confirmDelete = async () => {
    /* v8 ignore next -- defensive: the Delete button only exists inside the open dialog, so deleting is always set here */
    if (!deleting) return;
    await deleteChallenge({ variables: { id: deleting.id } });
    setDeleting(null);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" spacing={1.25} sx={{
        alignItems: "center"
      }}>
        <EmojiEventsIcon color="primary" />
        <Typography variant="h5" sx={{
          fontWeight: 800
        }}>{t('challenge.list.title')}</Typography>
      </Stack>

      <ChallengesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            {t('challenge.list.create')}
          </DuncitButton>
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
        <DialogTitle>{t('challenge.list.deleteTitle')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('challenge.list.deleteBody', { vars: { name: deleting?.name ?? '' } })}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <DuncitButton onClick={() => setDeleting(null)} disabled={deleteState.loading}>{t('shell.common.cancel')}</DuncitButton>
          <DuncitButton color="error" variant="contained" onClick={confirmDelete} disabled={deleteState.loading}>
            {deleteState.loading ? t('shell.common.deleting') : t('shell.common.delete')}
          </DuncitButton>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
