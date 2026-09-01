import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { useApolloTableFetch } from '@duncit/table';
import { useConfirm, notifyError } from '@duncit/dialogs';
import { CREATE_ROLE, DELETE_ROLE, ROLES_TABLE, UPDATE_ROLE, type RoleRow } from './queries';
import { blankRole, type RoleEdit } from './types';
import RolesTable from './RolesTable';
import RoleEditDialog from './RoleEditDialog';
import SuperAdminsManager from './SuperAdminsManager';
import { useTranslation } from '@duncit/shell';

export default function RolesPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [createRole] = useMutation<any>(CREATE_ROLE);
  const [updateRole] = useMutation<any>(UPDATE_ROLE);
  const [deleteRole] = useMutation<any>(DELETE_ROLE);
  const confirm = useConfirm();

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<RoleEdit>(blankRole);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<RoleRow>(client, ROLES_TABLE, 'rolesTable');

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
      title: t('admin.roles.deleteRole'),
      message: `Delete role "${r.key}"?`,
      destructive: true,
      confirmLabel: t('shell.common.delete'),
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
        <Typography variant="h5">{t('admin.roles.title')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Each role grants access to one portal. Assign roles to users from User Management.
        </Typography>
      </Box>

      <SuperAdminsManager />

      <RolesTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Role
          </DuncitButton>
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
