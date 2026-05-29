import { useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import {
  CREATE_FLAG,
  DELETE_FLAG,
  QUERY,
  SET_FLAG,
  UPDATE_FLAG,
  blankFlag,
  type FlagEdit,
} from './queries';
import FeatureFlagsTable from './FeatureFlagsTable';
import FlagEditDialog from './FlagEditDialog';

export default function FeatureFlagsPage() {
  const { data, loading, error, refetch } = useQuery(QUERY);
  const [setFlag] = useMutation(SET_FLAG);
  const [createFlag] = useMutation(CREATE_FLAG);
  const [updateFlag] = useMutation(UPDATE_FLAG);
  const [deleteFlag] = useMutation(DELETE_FLAG);
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FlagEdit>(blankFlag);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(blankFlag);
    setOpError(null);
    setEditOpen(true);
  };
  const openEdit = (f: any) => {
    setEditing({
      id: f.id,
      key: f.key,
      name: f.name,
      description: f.description ?? '',
      enabled: f.enabled,
    });
    setOpError(null);
    setEditOpen(true);
  };

  const toggle = async (f: any) => {
    try {
      await setFlag({ variables: { flag_id: f.id, enabled: !f.enabled } });
      setToast(`${f.name} ${!f.enabled ? 'enabled' : 'disabled'}`);
      await refetch();
    } catch (e: any) {
      setToast(e.message);
    }
  };

  const submit = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (editing.id) {
        await updateFlag({
          variables: {
            flag_id: editing.id,
            input: {
              name: editing.name,
              description: editing.description,
              enabled: editing.enabled,
            },
          },
        });
      } else {
        await createFlag({
          variables: {
            input: {
              key: editing.key.toLowerCase().trim(),
              name: editing.name,
              description: editing.description,
              enabled: editing.enabled,
            },
          },
        });
      }
      setEditOpen(false);
      setToast('Saved');
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (f: any) => {
    const ok = await confirm({
      title: 'Delete flag',
      message: `Delete flag "${f.key}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteFlag({ variables: { flag_id: f.id } });
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Feature Flags</Typography>
          <Typography variant="body2" color="text.secondary">
            Toggle features on or off across the platform without deploying code.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Flag
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <FeatureFlagsTable
        loading={loading}
        flags={data?.featureFlags ?? []}
        onToggle={toggle}
        onEdit={openEdit}
        onRemove={remove}
      />

      <FlagEditDialog
        open={editOpen}
        editing={editing}
        setEditing={setEditing}
        busy={busy}
        opError={opError}
        onClose={() => setEditOpen(false)}
        onSave={submit}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
