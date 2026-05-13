import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import {
  CREATE_ROLE,
  DELETE_ROLE,
  ROLES_AND_PERMS,
  SET_ROLE_PERMS,
  UPDATE_ROLE,
} from './queries';
import { blankRole, type RoleEdit } from './types';
import RolesTable from './RolesTable';
import RoleEditDialog from './RoleEditDialog';
import PermissionsDialog from './PermissionsDialog';

export default function RolesPage() {
  const { data, loading, error, refetch } = useQuery(ROLES_AND_PERMS);
  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);
  const [setPerms] = useMutation(SET_ROLE_PERMS);
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoleEdit>(blankRole);
  const [permsOpen, setPermsOpen] = useState(false);
  const [permsRoleId, setPermsRoleId] = useState<string | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const permsByResource = useMemo(() => {
    const map: Record<string, { key: string; action_key: string }[]> = {};
    for (const p of data?.permissions ?? []) {
      (map[p.resource_key] ||= []).push({ key: p.key, action_key: p.action_key });
    }
    return map;
  }, [data]);

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
            input: {
              key: editing.key,
              name: editing.name,
              description: editing.description,
              permission_keys: [],
            },
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

  const openPerms = (r: any) => {
    setPermsRoleId(r.id);
    setSelectedKeys(new Set(r.permission_keys ?? []));
    setOpError(null);
    setPermsOpen(true);
  };

  const toggleKey = (k: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const savePerms = async () => {
    if (!permsRoleId) return;
    setBusy(true);
    setOpError(null);
    try {
      await setPerms({
        variables: { role_id: permsRoleId, permission_keys: Array.from(selectedKeys) },
      });
      setPermsOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Roles</Typography>
          <Typography variant="body2" color="text.secondary">
            Roles bundle permissions and are assigned to users.
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
        onPerms={openPerms}
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

      <PermissionsDialog
        open={permsOpen}
        permsByResource={permsByResource}
        selectedKeys={selectedKeys}
        toggleKey={toggleKey}
        busy={busy}
        opError={opError}
        onClose={() => setPermsOpen(false)}
        onSave={savePerms}
      />
    </Stack>
  );
}
