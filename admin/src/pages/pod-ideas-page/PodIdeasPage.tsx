import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Box, MenuItem, Snackbar, Stack, TextField, Typography } from '@mui/material';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import {
  POD_IDEAS,
  SET_STATUS,
  DELETE_IDEA,
  STATUS_OPTIONS,
  Status,
} from './queries';
import DetailsDialog from './DetailsDialog';
import IdeasTable from './IdeasTable';
import IdeaDeleteDialog from './IdeaDeleteDialog';

export default function PodIdeasPage() {
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>('ALL');
  const [search, setSearch] = useState('');
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [delTarget, setDelTarget] = useState<any | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filter = useMemo(() => {
    const f: any = {};
    if (statusFilter !== 'ALL') f.status = statusFilter;
    if (search.trim()) f.search = search.trim();
    return Object.keys(f).length ? f : undefined;
  }, [statusFilter, search]);

  const { data, loading, refetch } = useQuery(POD_IDEAS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  });
  const ideas: any[] = data?.podIdeas ?? [];

  const [setStatusMut] = useMutation(SET_STATUS);
  const [deleteMut] = useMutation(DELETE_IDEA);

  const setStatus = async (id: string, status: Status) => {
    try {
      await setStatusMut({ variables: { id, status } });
      setToast(`Marked ${status.toLowerCase()}`);
      await refetch();
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
      await refetch();
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {s}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ flex: 1, maxWidth: 420 }}
          placeholder="Title or description"
        />
      </Stack>

      <IdeasTable
        loading={loading}
        hasData={!!data}
        ideas={ideas}
        onView={setDetailsId}
        onSetStatus={setStatus}
        onDelete={setDelTarget}
      />

      {detailsId && (
        <DetailsDialog id={detailsId} onClose={() => setDetailsId(null)} onChanged={refetch} />
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
