import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useApolloTableFetch } from '@duncit/table';
import { POD_IDEAS_TABLE, SET_STATUS, DELETE_IDEA, type IdeaRow, type Status } from './queries';
import DetailsDialog from './DetailsDialog';
import IdeasTable from './IdeasTable';
import IdeaDeleteDialog from './IdeaDeleteDialog';

export default function PodIdeasPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<IdeaRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<IdeaRow>(client, POD_IDEAS_TABLE, 'podIdeasTable');

  const [setStatusMut] = useMutation(SET_STATUS);
  const [deleteMut] = useMutation(DELETE_IDEA);

  const setStatus = async (id: string, status: Status) => {
    try {
      await setStatusMut({ variables: { id, status } });
      setToast(`Marked ${status.toLowerCase()}`);
      refetchRef.current?.();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  const doDelete = async () => {
    if (!delTarget) return;
    try {
      await deleteMut({ variables: { id: delTarget.id } });
      setToast('Deleted');
      setDelTarget(null);
      refetchRef.current?.();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <LightbulbIcon color="warning" />
        <Typography variant="h5" fontWeight={700} sx={{ flex: 1 }}>
          Pod Ideas
        </Typography>
      </Stack>

      <IdeasTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onView={setDetailsId}
        onSetStatus={setStatus}
        onDelete={setDelTarget}
      />

      {detailsId && (
        <DetailsDialog
          id={detailsId}
          onClose={() => setDetailsId(null)}
          onChanged={() => refetchRef.current?.()}
        />
      )}

      <IdeaDeleteDialog
        target={delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={doDelete}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Box>
  );
}
