import { useMemo, useState } from 'react';
import { notifyError } from '../components/notify';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

const QUERY = gql`
  query PermissionsAndDeps {
    permissions {
      id
      key
      resource_key
      action_key
      description
      is_system
    }
    resources {
      key
      name
    }
    actions {
      key
      name
    }
  }
`;

const CREATE = gql`
  mutation CreatePermission($input: CreatePermissionInput!) {
    createPermission(input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeletePermission($permission_id: ID!) {
    deletePermission(permission_id: $permission_id)
  }
`;

export default function PermissionsPage() {
  const { data, loading, error, refetch } = useQuery(QUERY);
  const [createMut] = useMutation(CREATE);
  const [deleteMut] = useMutation(DELETE);
  const [open, setOpen] = useState(false);
  const [resourceKey, setResourceKey] = useState('');
  const [actionKey, setActionKey] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const reset = () => {
    setResourceKey('');
    setActionKey('');
    setDescription('');
    setOpError(null);
  };

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      await createMut({
        variables: { input: { resource_key: resourceKey, action_key: actionKey, description } },
      });
      reset();
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete permission "${row.key}"?`)) return;
    try {
      await deleteMut({ variables: { permission_id: row.id } });
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const columns: GridColDef[] = useMemo(
    () => [
      { field: 'key', headerName: 'Key', flex: 1, minWidth: 220 },
      { field: 'resource_key', headerName: 'Resource', width: 140 },
      { field: 'action_key', headerName: 'Action', width: 140 },
      { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
      {
        field: 'is_system',
        headerName: 'Type',
        width: 110,
        renderCell: (p) =>
          p.value ? <Chip size="small" label="System" color="info" /> : <Chip size="small" label="Custom" />,
      },
      {
        field: 'actions',
        headerName: '',
        width: 80,
        sortable: false,
        renderCell: (p) => (
          <Tooltip title={p.row.is_system ? 'System (locked)' : 'Delete'}>
            <span>
              <IconButton size="small" disabled={p.row.is_system} onClick={() => remove(p.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        ),
      },
    ],
    []
  );

  const rows = (data?.permissions ?? []).map((p: any) => ({ ...p, id: p.id }));

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">Permissions</Typography>
          <Typography variant="body2" color="text.secondary">
            Resource × Action pairs that roles can grant.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            reset();
            setOpen(true);
          }}
        >
          New Permission
        </Button>
      </Stack>

      {error && <Alert severity="error">{error.message}</Alert>}

      <Card>
        <CardContent sx={{ p: 0 }}>
          <Box sx={{ height: 560, width: '100%' }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }}>
                <CircularProgress />
              </Stack>
            ) : (
              <DataGrid
                rows={rows}
                columns={columns}
                disableRowSelectionOnClick
                initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
                pageSizeOptions={[10, 25, 50]}
              />
            )}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New Permission</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Resource"
              value={resourceKey}
              onChange={(e) => setResourceKey(e.target.value)}
              fullWidth
            >
              {(data?.resources ?? []).map((r: any) => (
                <MenuItem key={r.key} value={r.key}>
                  {r.name} ({r.key})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Action"
              value={actionKey}
              onChange={(e) => setActionKey(e.target.value)}
              fullWidth
            >
              {(data?.actions ?? []).map((a: any) => (
                <MenuItem key={a.key} value={a.key}>
                  {a.name} ({a.key})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              fullWidth
              multiline
              minRows={2}
            />
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={busy || !resourceKey || !actionKey}>
            {busy ? 'Saving…' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
