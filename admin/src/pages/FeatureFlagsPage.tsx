import { useState } from 'react';
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
  Snackbar,
  Stack,
  Switch,
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
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const QUERY = gql`
  query FeatureFlags {
    featureFlags {
      id
      key
      name
      description
      enabled
      is_system
      updated_at
    }
  }
`;
const SET_FLAG = gql`
  mutation SetFlag($flag_id: ID!, $enabled: Boolean!) {
    setFeatureFlag(flag_id: $flag_id, enabled: $enabled) {
      id
      enabled
    }
  }
`;
const CREATE = gql`
  mutation CreateFlag($input: CreateFeatureFlagInput!) {
    createFeatureFlag(input: $input) {
      id
    }
  }
`;
const UPDATE = gql`
  mutation UpdateFlag($flag_id: ID!, $input: UpdateFeatureFlagInput!) {
    updateFeatureFlag(flag_id: $flag_id, input: $input) {
      id
    }
  }
`;
const DELETE = gql`
  mutation DeleteFlag($flag_id: ID!) {
    deleteFeatureFlag(flag_id: $flag_id)
  }
`;

interface FlagEdit {
  id?: string;
  key: string;
  name: string;
  description: string;
  enabled: boolean;
}
const blank: FlagEdit = { key: '', name: '', description: '', enabled: false };

export default function FeatureFlagsPage() {
  const { data, loading, error, refetch } = useQuery(QUERY);
  const [setFlag] = useMutation(SET_FLAG);
  const [createFlag] = useMutation(CREATE);
  const [updateFlag] = useMutation(UPDATE);
  const [deleteFlag] = useMutation(DELETE);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<FlagEdit>(blank);
  const [busy, setBusy] = useState(false);
  const [opError, setOpError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(blank);
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
    if (!confirm(`Delete flag "${f.key}"?`)) return;
    try {
      await deleteFlag({ variables: { flag_id: f.id } });
      await refetch();
    } catch (e: any) {
      alert(e.message);
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
                  <TableCell>Enabled</TableCell>
                  <TableCell>Key</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(data?.featureFlags ?? []).map((f: any) => (
                  <TableRow key={f.id} hover>
                    <TableCell>
                      <Switch checked={!!f.enabled} onChange={() => toggle(f)} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {f.key}
                      </Typography>
                    </TableCell>
                    <TableCell>{f.name}</TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>
                      <Typography variant="body2" color="text.secondary">
                        {f.description || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {f.is_system ? (
                        <Chip size="small" label="System" color="info" />
                      ) : (
                        <Chip size="small" label="Custom" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(f)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={f.is_system ? 'System (locked)' : 'Delete'}>
                        <span>
                          <IconButton
                            size="small"
                            disabled={f.is_system}
                            onClick={() => remove(f)}
                          >
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

      <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing.id ? 'Edit Flag' : 'New Feature Flag'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Key"
              value={editing.key}
              onChange={(e) => setEditing((p) => ({ ...p, key: e.target.value }))}
              disabled={!!editing.id}
              helperText="Lowercase, e.g. venue_booking"
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
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={editing.enabled}
                onChange={(_, v) => setEditing((p) => ({ ...p, enabled: v }))}
              />
              <Typography variant="body2">{editing.enabled ? 'Enabled' : 'Disabled'}</Typography>
            </Stack>
            {opError && <Alert severity="error">{opError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submit}
            disabled={busy || !editing.key || !editing.name}
          >
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
