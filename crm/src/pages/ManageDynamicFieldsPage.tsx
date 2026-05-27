import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  FormControlLabel,
  IconButton,
  MenuItem,
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
import TuneIcon from '@mui/icons-material/Tune';
import {
  CREATE_CRM_DYNAMIC_FIELD,
  CRM_DYNAMIC_FIELDS,
  DELETE_CRM_DYNAMIC_FIELD,
  UPDATE_CRM_DYNAMIC_FIELD,
} from '../api/crm.gql';
import type { CrmDynamicField, CrmDynamicFieldKind } from '../api/crm.types';
import ConfirmDialog from '../components/ConfirmDialog';
import { parseApiError } from '../utils/parseApiError';

interface DraftState {
  id?: string;
  name: string;
  label: string;
  kind: CrmDynamicFieldKind;
  optionsText: string;
  applies_to_venue: boolean;
  applies_to_host: boolean;
  required: boolean;
  sort_order: string;
  is_active: boolean;
}

const blankDraft: DraftState = {
  name: '',
  label: '',
  kind: 'text',
  optionsText: '',
  applies_to_venue: true,
  applies_to_host: true,
  required: false,
  sort_order: '0',
  is_active: true,
};

const KIND_LABELS: Record<CrmDynamicFieldKind, string> = {
  text: 'Text',
  textarea: 'Long text',
  number: 'Number',
  boolean: 'Yes / No',
  date: 'Date',
  select: 'Select (one of)',
};

export default function ManageDynamicFieldsPage() {
  const { data, loading, error } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(
    CRM_DYNAMIC_FIELDS,
    { variables: { include_inactive: true }, fetchPolicy: 'cache-and-network' }
  );

  const refetchAfter = [
    { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
    // The lead detail pages render fields filtered by entity, so refetch
    // those variants too.
    { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
    { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'HOST_LEAD', include_inactive: false } },
  ];

  const [createMut, createState] = useMutation(CREATE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });
  const [updateMut, updateState] = useMutation(UPDATE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });
  const [deleteMut, deleteState] = useMutation(DELETE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [removing, setRemoving] = useState<CrmDynamicField | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      (data?.crmDynamicFields ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [data]
  );

  const startCreate = () => {
    const nextSort = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setDraft({ ...blankDraft, sort_order: String(nextSort) });
    setFormError(null);
  };

  const startEdit = (row: CrmDynamicField) => {
    setDraft({
      id: row.id,
      name: row.name,
      label: row.label,
      kind: row.kind,
      optionsText: row.options.join('\n'),
      applies_to_venue: row.applies_to_venue,
      applies_to_host: row.applies_to_host,
      required: row.required,
      sort_order: String(row.sort_order),
      is_active: row.is_active,
    });
    setFormError(null);
  };

  const cancelDraft = () => {
    setDraft(null);
    setFormError(null);
  };

  const save = async () => {
    if (!draft) return;
    const label = draft.label.trim();
    const name = (draft.name || draft.label).trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    if (!label) {
      setFormError('Label is required');
      return;
    }
    if (!draft.applies_to_venue && !draft.applies_to_host) {
      setFormError('Pick at least one of: applies to Venue / Host.');
      return;
    }
    const options = draft.kind === 'select'
      ? draft.optionsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [];
    const sort_order = Number.parseInt(draft.sort_order, 10);
    const input = {
      name,
      label,
      kind: draft.kind,
      options,
      applies_to_venue: draft.applies_to_venue,
      applies_to_host: draft.applies_to_host,
      required: draft.required,
      sort_order: Number.isFinite(sort_order) ? sort_order : 0,
      is_active: draft.is_active,
    };
    try {
      if (draft.id) await updateMut({ variables: { id: draft.id, input } });
      else await createMut({ variables: { input } });
      setDraft(null);
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

  const toggleActive = async (row: CrmDynamicField) => {
    try {
      await updateMut({
        variables: {
          id: row.id,
          input: {
            name: row.name,
            label: row.label,
            kind: row.kind,
            options: row.options,
            applies_to_venue: row.applies_to_venue,
            applies_to_host: row.applies_to_host,
            required: row.required,
            sort_order: row.sort_order,
            is_active: !row.is_active,
          },
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
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Dynamic Fields
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Define custom fields that appear on both venue & host edit forms. Add once — applies
            everywhere, no code change required.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={startCreate} disabled={busy || !!draft}>
          New field
        </Button>
      </Stack>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {formError && (
        <Alert severity="error" onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {draft && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
            {draft.id ? `Edit field — ${draft.label || draft.name}` : 'New field'}
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                fullWidth
                size="small"
                label="Label"
                value={draft.label}
                onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                helperText="What the user sees on the form."
                data-testid="dynamic-field-label"
              />
              {!draft.id && (
                <TextField
                  fullWidth
                  size="small"
                  label="Key (auto)"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  helperText="lowercase_with_underscores. Auto-derived from label when blank."
                />
              )}
              <TextField
                size="small"
                select
                label="Type"
                value={draft.kind}
                onChange={(e) => setDraft({ ...draft, kind: e.target.value as CrmDynamicFieldKind })}
                sx={{ minWidth: 160 }}
              >
                {(Object.keys(KIND_LABELS) as CrmDynamicFieldKind[]).map((k) => (
                  <MenuItem key={k} value={k}>
                    {KIND_LABELS[k]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                size="small"
                label="Order"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })}
                inputProps={{ inputMode: 'numeric' }}
                sx={{ width: 110 }}
              />
            </Stack>

            {draft.kind === 'select' && (
              <TextField
                fullWidth
                size="small"
                multiline
                minRows={3}
                label="Options (one per line)"
                value={draft.optionsText}
                onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
              />
            )}

            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              <FormControlLabel
                control={<Checkbox checked={draft.applies_to_venue} onChange={(e) => setDraft({ ...draft, applies_to_venue: e.target.checked })} />}
                label="Applies to Venue leads"
              />
              <FormControlLabel
                control={<Checkbox checked={draft.applies_to_host} onChange={(e) => setDraft({ ...draft, applies_to_host: e.target.checked })} />}
                label="Applies to Host leads"
              />
              <FormControlLabel
                control={<Checkbox checked={draft.required} onChange={(e) => setDraft({ ...draft, required: e.target.checked })} />}
                label="Required"
              />
              <FormControlLabel
                control={<Switch checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} />}
                label="Active"
              />
            </Stack>

            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button onClick={cancelDraft} disabled={busy}>
                Cancel
              </Button>
              <Button variant="contained" startIcon={<SaveIcon />} onClick={save} disabled={busy}>
                {busy ? 'Saving…' : 'Save field'}
              </Button>
            </Stack>
          </Stack>
        </Card>
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
                  <TableCell>Label · Key</TableCell>
                  <TableCell sx={{ width: 130 }}>Type</TableCell>
                  <TableCell sx={{ width: 200 }}>Applies to</TableCell>
                  <TableCell sx={{ width: 100 }}>Active</TableCell>
                  <TableCell sx={{ width: 140 }} align="right">
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && !draft && (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>
                        No dynamic fields yet. Click "New field" to add one — it will appear on
                        every lead edit form.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.sort_order}</TableCell>
                    <TableCell>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="body2" fontWeight={600}>
                          {row.label}
                        </Typography>
                        {row.required && <Chip size="small" label="Required" color="warning" />}
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {row.name}
                      </Typography>
                    </TableCell>
                    <TableCell>{KIND_LABELS[row.kind]}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        {row.applies_to_venue && <Chip size="small" label="Venue" />}
                        {row.applies_to_host && <Chip size="small" label="Host" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Switch checked={row.is_active} onChange={() => toggleActive(row)} disabled={busy} />
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <span>
                          <IconButton
                            aria-label="Edit"
                            size="small"
                            onClick={() => startEdit(row)}
                            disabled={busy || !!draft}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <span>
                          <IconButton
                            aria-label="Delete"
                            size="small"
                            color="error"
                            onClick={() => setRemoving(row)}
                            disabled={busy || !!draft}
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

      <ConfirmDialog
        open={!!removing}
        title="Delete dynamic field"
        message={
          removing
            ? `Delete "${removing.label}"? Existing values on leads stay in the database but are no longer rendered.`
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
