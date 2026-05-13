import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  BADGES,
  CREATE_BADGE,
  DELETE_BADGE,
  UPDATE_BADGE,
  emptyBadge,
  type BadgeForm,
} from './queries';
import BadgeCard from './BadgeCard';
import BadgeFormDialog from './BadgeFormDialog';
import { useConfirm } from '../../components/useConfirm';

export default function BadgesPage() {
  const { data, loading, error, refetch } = useQuery(BADGES);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BadgeForm>(emptyBadge);
  const [createBadge, createState] = useMutation(CREATE_BADGE);
  const [updateBadge, updateState] = useMutation(UPDATE_BADGE);
  const [deleteBadge] = useMutation(DELETE_BADGE);
  const confirm = useConfirm();
  const busy = createState.loading || updateState.loading;

  const startCreate = () => {
    setForm(emptyBadge);
    setOpen(true);
  };
  const startEdit = (b: any) => {
    setForm({
      id: b.id,
      title: b.title,
      description: b.description,
      image_url: b.image_url,
      condition_type: b.condition_type,
      threshold: b.threshold,
      is_active: b.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    const { id, ...input } = form;
    if (id) {
      await updateBadge({ variables: { id, input } });
    } else {
      await createBadge({ variables: { input } });
    }
    setOpen(false);
    await refetch();
  };

  const remove = async (b: any) => {
    const ok = await confirm({
      title: 'Delete badge',
      message: `Delete badge "${b.title}"? This also revokes it from all users.`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    await deleteBadge({ variables: { id: b.id } });
    await refetch();
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Badges
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={startCreate}>
          New Badge
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error.message}</Alert>}
      {loading && !data && <CircularProgress />}

      <Box
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)' },
        }}
      >
        {(data?.badges ?? []).map((b: any) => (
          <BadgeCard key={b.id} badge={b} onEdit={startEdit} onRemove={remove} />
        ))}
      </Box>

      <BadgeFormDialog
        open={open}
        form={form}
        setForm={setForm}
        busy={busy}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Box>
  );
}
