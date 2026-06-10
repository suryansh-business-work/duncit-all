import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Card,
  CardContent,
  CircularProgress,
  InputAdornment,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
  CRM_MANAGED_OPTIONS,
  CREATE_CRM_MANAGED_OPTION,
  DELETE_CRM_MANAGED_OPTION,
  UPDATE_CRM_MANAGED_OPTION,
  type CrmManagedOption,
  type CrmManagedOptionGroup,
} from '../../../api/data.gql';
import { CRM_LEAD_CONFIG } from '../../../api/crm.gql';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { parseApiError } from '../../../utils/parseApiError';
import ManagedOptionEditRow, { type ManagedEditRow } from './ManagedOptionEditRow';
import ManagedOptionRow from './ManagedOptionRow';

interface Props {
  group: CrmManagedOptionGroup;
  addLabel: string;
  placeholder: string;
  searchPlaceholder: string;
}

const blank: ManagedEditRow = { name: '', sort_order: '0', is_active: true };

/** Inline-editable flat list for one managed-option group (Amenity / Suitability). */
export default function ManagedOptionList({ group, addLabel, placeholder, searchPlaceholder }: Readonly<Props>) {
  const queryVars = { group, include_inactive: true };
  const { data, loading, error } = useQuery<{ crmManagedOptions: CrmManagedOption[] }>(CRM_MANAGED_OPTIONS, {
    variables: queryVars,
    fetchPolicy: 'cache-and-network',
  });
  const refetchQueries = [{ query: CRM_MANAGED_OPTIONS, variables: queryVars }, { query: CRM_LEAD_CONFIG }];
  const [createMut, createState] = useMutation(CREATE_CRM_MANAGED_OPTION, { refetchQueries });
  const [updateMut, updateState] = useMutation(UPDATE_CRM_MANAGED_OPTION, { refetchQueries });
  const [deleteMut, deleteState] = useMutation(DELETE_CRM_MANAGED_OPTION, { refetchQueries });

  const [draft, setDraft] = useState<ManagedEditRow | null>(null);
  const [removing, setRemoving] = useState<CrmManagedOption | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const rows = useMemo(
    () => (data?.crmManagedOptions ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [data]
  );
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
  }, [rows, search]);
  const busy = createState.loading || updateState.loading || deleteState.loading;

  const startCreate = () => {
    const next = rows.length ? Math.max(...rows.map((r) => r.sort_order)) + 1 : 0;
    setDraft({ ...blank, sort_order: String(next) });
    setFormError(null);
  };

  const save = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) return setFormError('Name is required.');
    const parsed = Number.parseInt(draft.sort_order, 10);
    const sort_order = Number.isFinite(parsed) ? parsed : 0;
    try {
      if (draft.id) {
        await updateMut({ variables: { id: draft.id, input: { name, sort_order, is_active: draft.is_active } } });
      } else {
        await createMut({ variables: { input: { name, group, sort_order, is_active: draft.is_active } } });
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
    } catch (e) {
      setFormError(parseApiError(e));
    }
    setRemoving(null);
  };

  return (
    <Card>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          <TextField
            size="small"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ minWidth: 220, flex: 1 }}
          />
          <Button variant="outlined" startIcon={<AddIcon />} onClick={startCreate} disabled={busy || !!draft}>
            {addLabel}
          </Button>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{parseApiError(error)}</Alert>}
        {formError && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setFormError(null)}>{formError}</Alert>}

        {loading && rows.length === 0 ? (
          <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 80 }}>Order</TableCell>
                <TableCell>Name</TableCell>
                <TableCell sx={{ width: 90 }}>Active</TableCell>
                <TableCell sx={{ width: 110 }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {draft && !draft.id && (
                <ManagedOptionEditRow draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} placeholder={placeholder} />
              )}
              {rows.length === 0 && !draft && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Nothing here yet. Click "{addLabel}".</Typography>
                  </TableCell>
                </TableRow>
              )}
              {rows.length > 0 && visible.length === 0 && !draft && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No matches for your search.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {visible.map((row) =>
                draft?.id === row.id ? (
                  <ManagedOptionEditRow key={row.id} draft={draft!} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} busy={busy} placeholder={placeholder} />
                ) : (
                  <ManagedOptionRow
                    key={row.id}
                    row={row}
                    busy={busy}
                    disableActions={busy || !!draft}
                    onToggleActive={() => updateMut({ variables: { id: row.id, input: { is_active: !row.is_active } } })}
                    onEdit={() => { setDraft({ id: row.id, name: row.name, sort_order: String(row.sort_order), is_active: row.is_active }); setFormError(null); }}
                    onDelete={() => setRemoving(row)}
                  />
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <ConfirmDialog
        open={!!removing}
        title={`Delete "${removing?.name ?? ''}"`}
        message="Existing leads keep their entries — only this list is affected."
        confirmLabel="Delete"
        loading={deleteState.loading}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Card>
  );
}
