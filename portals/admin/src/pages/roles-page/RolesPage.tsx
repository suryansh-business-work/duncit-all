import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { CREATE_ROLE, DELETE_ROLE, ROLES_TABLE, UPDATE_ROLE, type RoleRow } from './queries';
import { blankRole, type RoleEdit } from './types';
import RolesTable from './RolesTable';
import RoleEditDialog from './RoleEditDialog';
import SuperAdminsManager from './SuperAdminsManager';

export default function RolesPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoleEdit>(blankRole);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: ROLES_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.rolesTable.rows as RoleRow[], total: data.rolesTable.total as number };
    },
    [client],
  );

  const openCreate = () => {
    setEditing(blankRole);
    setOpError(null);
    setEditOpen(true);
  };
  const openEdit = (r: RoleRow) => {
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
      refetchRef.current?.();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const removeRole = async (r: RoleRow) => {
    const ok = await confirm({
      title: 'Delete role',
      message: `Delete role "${r.key}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await deleteRole({ variables: { role_id: r.id } });
      refetchRef.current?.();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Roles</Typography>
        <Typography variant="body2" color="text.secondary">
          Each role grants access to one portal. Assign roles to users from User Management.
        </Typography>
      </Box>

      <SuperAdminsManager />

      <RolesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Role
          </Button>
        }
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
