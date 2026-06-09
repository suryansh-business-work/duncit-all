import { useMemo, useState } from 'react';
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
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import HandymanIcon from '@mui/icons-material/Handyman';
import {
  CREATE_CRM_SERVICE,
  CRM_LEAD_CONFIG,
  CRM_SERVICES,
  DELETE_CRM_SERVICE,
  UPDATE_CRM_SERVICE,
} from '../api/crm.gql';
import type { CrmService, CrmServiceKind } from '../api/crm.types';
import ConfirmDialog from '../components/ConfirmDialog';
import { parseApiError } from '../utils/parseApiError';

interface Props {
  /** Catalogue this page edits — `VENUE` for /venue-leads/services, `HOST` for /host-leads/services. */
  kind: CrmServiceKind;
  title?: string;
  subtitle?: string;
}

interface EditRow {
  id?: string;
  name: string;
  sort_order: string;
  is_active: boolean;
}

const blankRow: EditRow = { name: '', sort_order: '0', is_active: true };

export default function ManageServicesPage({
  kind,
  title = kind === 'HOST' ? 'Manage Host Services' : 'Manage Venue Services',
  subtitle = kind === 'HOST'
    ? 'Edit the catalogue used by the "Services Offered" dropdown on Host Leads. Independent from the Venue catalogue.'
    : 'Edit the catalogue used by the "Services Offered" dropdown on Venue Leads. Independent from the Host catalogue.',
}: Readonly<Props>) {
  const queryVars = { kind, include_inactive: true };
  const { data, loading, error } = useQuery<{ crmServices: CrmService[] }>(CRM_SERVICES, {
    variables: queryVars,
    fetchPolicy: 'cache-and-network',
  });
  // Mutations refetch both the catalogue list and `crmLeadConfig` so the
  // dropdown inside lead forms reflects changes immediately. The two
  // queries don't share normalised entities, so refetch-by-query is the
  // simplest correct path here.
  const refetchAfterMutate = [
    { query: CRM_SERVICES, variables: queryVars },
    { query: CRM_LEAD_CONFIG },
  ];
  const [createMut, createState] = useMutation(CREATE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });
  const [updateMut, updateState] = useMutation(UPDATE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });
  const [deleteMut, deleteState] = useMutation(DELETE_CRM_SERVICE, { refetchQueries: refetchAfterMutate });

  const [draft, setDraft] = useState<EditRow | null>(null);
  const [removing, setRemoving] = useState<CrmService | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      (data?.crmServices ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [data]
  );

  const startCreate = () => {
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setDraft({ ...blankRow, sort_order: String(nextSort) });
    setFormError(null);
  };

  const startEdit = (row: CrmService) => {
    setDraft({
      id: row.id,
      name: row.name,
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });
    setFormError(null);
  };

  const cancelDraft = () => {
    setDraft(null);
    setFormError(null);
  };

  const saveDraft = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setFormError('Service name is required');
      return;
    }
    const sort_order = Number.parseInt(draft.sort_order, 10);
    const input = {
      name,
      kind,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
      is_active: draft.is_active,
    };
    try {
      if (draft.id) {
        await updateMut({ variables: { id: draft.id, input } });
      } else {
        await createMut({ variables: { input } });
      }
      setDraft(null);
      setFormError(null);
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const confirmDelete = async () => {
    if (!removing) return;
    try {
      await deleteMut({ variables: { id: removing.id } });
      setRemoving(null);
    } catch (e) {
      setFormError(parseApiError(e));
      setRemoving(null);
    }
  };

  const toggleActive = async (row: CrmService) => {
    try {
      await updateMut({
        variables: {
          id: row.id,
          input: { name: row.name, kind, sort_order: row.sort_order, is_active: !row.is_active },
        },
      });
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const busy = createState.loading || updateState.loading || deleteState.loading;

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <HandymanIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            {title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={startCreate}
          disabled={busy || !!draft}
        >
          Add service
        </Button>
      </Stack>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && rows.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 80 }}>Order</TableCell>
                  <TableCell>Service name</TableCell>
                  <TableCell sx={{ width: 110 }}>Active</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {draft && !draft.id && (
                  <TableRow>
                    <TableCell>
                      <TextField
                        size="small"
                        value={draft.sort_order}
                        inputProps={{ inputMode: 'numeric' }}
                        onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
                        sx={{ width: 70 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        fullWidth
                        autoFocus
                        placeholder="e.g. Coaching / Training"
                        value={draft.name}
                        onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={draft.is_active}
                        onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Save">
                        <span>
                          <IconButton
                            aria-label="Save"
                            size="small"
                            color="primary"
                            onClick={saveDraft}
                            disabled={busy}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Cancel">
                        <span>
                          <IconButton
                            aria-label="Cancel"
                            size="small"
                            onClick={cancelDraft}
                            disabled={busy}
                          >
                            <CloseIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )}

                {rows.length === 0 && !draft && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No services yet. Click "Add service" to create the first one.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}

                {rows.map((row) => {
                  const editing = draft?.id === row.id;
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell>
                        {editing ? (
                          <TextField
                            size="small"
                            value={draft!.sort_order}
                            inputProps={{ inputMode: 'numeric' }}
                            onChange={(e) => setDraft({ ...draft!, sort_order: e.target.value })}
                            sx={{ width: 70 }}
                          />
                        ) : (
                          row.sort_order
                        )}
                      </TableCell>
                      <TableCell>
                        {editing ? (
                          <TextField
                            size="small"
                            fullWidth
                            value={draft!.name}
                            onChange={(e) => setDraft({ ...draft!, name: e.target.value })}
                          />
                        ) : (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {row.name}
                            </Typography>
                            {!row.is_active && <Chip size="small" label="Inactive" color="warning" />}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={editing ? draft!.is_active : row.is_active}
                          onChange={(e) => {
                            if (editing) {
                              setDraft({ ...draft!, is_active: e.target.checked });
                            } else {
                              toggleActive(row);
                            }
                          }}
                          disabled={busy && !editing}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {editing ? (
                          <>
                            <Tooltip title="Save">
                              <span>
                                <IconButton size="small" color="primary" onClick={saveDraft} disabled={busy}>
                                  <SaveIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <span>
                                <IconButton size="small" onClick={cancelDraft} disabled={busy}>
                                  <CloseIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        ) : (
                          <>
                            <Tooltip title="Edit">
                              <span>
                                <IconButton size="small" onClick={() => startEdit(row)} disabled={busy || !!draft}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => setRemoving(row)}
                                  disabled={busy || !!draft}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removing}
        title="Delete service"
        message={
          removing
            ? `Delete "${removing.name}"? Existing leads keep their entries — only the dropdown is affected.`
            : ''
        }
        confirmLabel="Delete"
        loading={deleteState.loading}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
}
