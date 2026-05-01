import { useEffect, useMemo, useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SecurityIcon from '@mui/icons-material/Security';

const QUERY = gql`
  query RolesAndPerms {
    roles {
      id
      key
      name
      description
      is_system
      permission_keys
    }
    permissions {
      id
      key
      resource_key
      action_key
    }
  }
`;
const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
    }
  }
`;
const UPDATE_ROLE = gql`
  mutation UpdateRole($role_id: ID!, $input: UpdateRoleInput!) {
    updateRole(role_id: $role_id, input: $input) {
      id
    }
  }
`;
const DELETE_ROLE = gql`
  mutation DeleteRole($role_id: ID!) {
    deleteRole(role_id: $role_id)
  }
`;
const SET_PERMS = gql`
  mutation SetRolePermissions($role_id: ID!, $permission_keys: [String!]!) {
    setRolePermissions(role_id: $role_id, permission_keys: $permission_keys) {
      id
      permission_keys
    }
  }
`;

interface RoleEdit {
  id?: string;
  key: string;
  name: string;
  description: string;
}
const blankRole: RoleEdit = { key: '', name: '', description: '' };

export default function RolesPage() {
  const { data, loading, error, refetch } = useQuery(QUERY);
  const [createRole] = useMutation(CREATE_ROLE);
  const [updateRole] = useMutation(UPDATE_ROLE);
  const [deleteRole] = useMutation(DELETE_ROLE);
  const [setPerms] = useMutation(SET_PERMS);

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
    if (!confirm(`Delete role "${r.key}"?`)) return;
    try {
      await deleteRole({ variables: { role_id: r.id } });
      await refetch();
    } catch (e: any) {
      alert(e.message);
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

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Stack alignItems="center" sx={{ p: 4 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Permissions</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.roles ?? []).map((r: any) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {r.key}
                      </Typography>
                    </TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {r.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={`${r.permission_keys?.length ?? 0} perms`} />
                    </TableCell>
                    <TableCell>
                      {r.is_system ? (
                        <Chip size="small" label="System" color="info" />
                      ) : (
                        <Chip size="small" label="Custom" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Permissions">
                        <IconButton size="small" onClick={() => openPerms(r)}>
                          <SecurityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(r)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={r.is_system ? 'System (locked)' : 'Delete'}>
                        <span>
                          <IconButton size="small" disabled={r.is_system} onClick={() => removeRole(r)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/create role dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing.id ? 'Edit Role' : 'New Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key"
              value={editing.key}
              onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
              disabled={!!editing.id}
              helperText="Uppercase, e.g. CITY_ADMIN"
              fullWidth
            />
            <TextField
              label="Name"
              value={editing.name}
              onChange={(e) => setEditing((p) => ({ ...p, name: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Description"
              value={editing.description}
              onChange={(e) => setEditing((p) => ({ ...p, description: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveRole} disabled={busy || !editing.key || !editing.name}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Permission matrix dialog */}
      <Dialog open={permsOpen} onClose={() => setPermsOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Edit Permissions</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {Object.keys(permsByResource).length === 0 && (
              <Alert severity="info">No permissions defined yet.</Alert>
            )}
            {Object.entries(permsByResource).map(([resource, perms]) => (
              <Box key={resource}>
                <Typography variant="subtitle2" gutterBottom textTransform="uppercase">
                  {resource}
                </Typography>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
                  {perms.map((p) => (
                    <FormControlLabel
                      key={p.key}
                      sx={{ minWidth: 180 }}
                      control={
                        <Checkbox
                          checked={selectedKeys.has(p.key)}
                          onChange={() => toggleKey(p.key)}
                          size="small"
                        />
                      }
                      label={p.action_key}
                    />
                  ))}
                </Stack>
                <Divider sx={{ mt: 1 }} />
              </Box>
            ))}
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPermsOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={savePerms} disabled={busy}>
            {busy ? 'Saving…' : 'Save Permissions'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
