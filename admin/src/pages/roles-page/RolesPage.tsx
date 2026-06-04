import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { CREATE_ROLE, DELETE_ROLE, ROLES_QUERY, UPDATE_ROLE } from './queries';
import { blankRole, type RoleEdit } from './types';
import RolesTable from './RolesTable';
import RoleEditDialog from './RoleEditDialog';

export default function RolesPage() {
  const { data, loading, error, refetch } = useQuery(ROLES_QUERY);
  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoleEdit>(blankRole);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(blankRole);
    setOpError(null);
    setEditOpen(true);
  };
  const openEdit = (r: any) => {
    setEditing({ id: r.id, key: r.key, name: r.name, description: r.description ?? '' });
    setOpError(null);
    setEditOpen(true);
  };

  const saveRole = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (editing.id) {
        await updateRole({
          variables: {
            role_id: editing.id,
            input: { name: editing.name, description: editing.description },
          },
        });
      } else {
        await createRole({
          variables: {
            input: { key: editing.key, name: editing.name, description: editing.description },
          },
        });
      }
      setEditOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeRole = async (r: any) => {
    const ok = await confirm({
      title: 'Delete role',
      message: `Delete role "${r.key}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteRole({ variables: { role_id: r.id } });
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Roles</Typography>
          <Typography variant="body2" color="text.secondary">
            Each role grants access to one portal. Assign roles to users from User Management.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New Role
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <RolesTable
        loading={loading}
        roles={data?.roles ?? []}
        onEdit={openEdit}
        onDelete={removeRole}
      />

      <RoleEditDialog
        open={editOpen}
        editing={editing}
        setEditing={setEditing}
        busy={busy}
        opError={opError}
        onClose={() => setEditOpen(false)}
        onSave={saveRole}
      />
    </Stack>
  );
}
