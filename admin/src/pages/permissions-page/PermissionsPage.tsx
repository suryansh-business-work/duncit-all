import { useMemo, useState } from 'react';
import { notifyError } from '../../components/notify';
import { useConfirm } from '../../components/useConfirm';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { CREATE_PERMISSION, DELETE_PERMISSION, QUERY } from './queries';
import NewPermissionDialog from './NewPermissionDialog';

export default function PermissionsPage() {
  const { data, loading, error, refetch } = useQuery(QUERY);
  const [createMut] = useMutation(CREATE_PERMISSION);
  const [deleteMut] = useMutation(DELETE_PERMISSION);
  const confirm = useConfirm();
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
    const ok = await confirm({
      title: 'Delete permission',
      message: `Delete permission "${row.key}"?`,
      destructive: true,
      confirmLabel: 'Delete',
    });
    if (!ok) return;
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

      <NewPermissionDialog
        open={open}
        resources={data?.resources ?? []}
        actions={data?.actions ?? []}
        resourceKey={resourceKey}
        actionKey={actionKey}
        description={description}
        busy={busy}
        opError={opError}
        setResourceKey={setResourceKey}
        setActionKey={setActionKey}
        setDescription={setDescription}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Stack>
  );
}
