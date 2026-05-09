import { useState } from 'react';
import { notifyError } from '../../components/notify';
import { useMutation, useQuery, type DocumentNode } from '@apollo/client';
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
import EditIcon from '@mui/icons-material/Edit';
import KeyEntityEditDialog, { type Editing, blankEditing } from './KeyEntityEditDialog';

export interface KeyEntityCrudPageProps {
  title: string;
  subtitle: string;
  listQuery: DocumentNode;
  listKey: string;
  createMutation: DocumentNode;
  updateMutation: DocumentNode;
  deleteMutation: DocumentNode;
  /** @example 'resource' for input args { resource_id, input } */
  argName: string;
  keyHelperText: string;
}

export function KeyEntityCrudPage(props: KeyEntityCrudPageProps) {
  const { data, loading, error, refetch } = useQuery(props.listQuery);
  const [createMut] = useMutation(props.createMutation);
  const [updateMut] = useMutation(props.updateMutation);
  const [deleteMut] = useMutation(props.deleteMutation);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Editing>(blankEditing);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);

  const idVarName = `${props.argName}_id`;

  const openCreate = () => {
    setEditing(blankEditing);
    setOpError(null);
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setEditing({ id: row.id, key: row.key, name: row.name, description: row.description ?? '' });
    setOpError(null);
    setOpen(true);
  };

  const save = async () => {
    setBusy(true);
    setOpError(null);
    try {
      if (editing.id) {
        await updateMut({
          variables: {
            [idVarName]: editing.id,
            input: { name: editing.name, description: editing.description },
          },
        });
      } else {
        await createMut({
          variables: {
            input: { key: editing.key, name: editing.name, description: editing.description },
          },
        });
      }
      setOpen(false);
      await refetch();
    } catch (e: any) {
      setOpError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: any) => {
    if (!confirm(`Delete "${row.key}"?`)) return;
    try {
      await deleteMut({ variables: { [idVarName]: row.id } });
      await refetch();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const columns: GridColDef[] = [
    { field: 'key', headerName: 'Key', width: 200 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
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
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(p.row)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={p.row.is_system ? 'System (locked)' : 'Delete'}>
            <span>
              <IconButton size="small" disabled={p.row.is_system} onClick={() => remove(p.row)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  const rows = (data?.[props.listKey] ?? []).map((r: any) => ({ ...r, id: r.id }));

  return (
    <Stack spacing={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="h5">{props.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {props.subtitle}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
          New
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

      <KeyEntityEditDialog
        open={open}
        title={props.title}
        editing={editing}
        setEditing={setEditing}
        busy={busy}
        opError={opError}
        keyHelperText={props.keyHelperText}
        onClose={() => setOpen(false)}
        onSave={save}
      />
    </Stack>
  );
}
