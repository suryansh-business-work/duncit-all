import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TuneIcon from '@mui/icons-material/Tune';
import {
  CREATE_CRM_DYNAMIC_FIELD,
  CRM_DYNAMIC_FIELDS,
  DELETE_CRM_DYNAMIC_FIELD,
  REORDER_CRM_DYNAMIC_FIELDS,
  UPDATE_CRM_DYNAMIC_FIELD,
} from '../../api/crm.gql';
import type { CrmDynamicField } from '../../api/crm.types';
import { ConfirmDialog } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import DynamicFieldForm from './DynamicFieldForm';
import DynamicFieldsTable from './DynamicFieldsTable';
import { blankDraft, buildDynamicFieldInput, draftFromRow, type DraftState } from './dynamicFieldDraft';

const refetchAfter = [
  { query: CRM_DYNAMIC_FIELDS, variables: { include_inactive: true } },
  { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'VENUE_LEAD', include_inactive: false } },
  { query: CRM_DYNAMIC_FIELDS, variables: { entity: 'HOST_LEAD', include_inactive: false } },
];

export default function ManageDynamicFieldsPage() {
  const { data, loading, error } = useQuery<{ crmDynamicFields: CrmDynamicField[] }>(
    CRM_DYNAMIC_FIELDS,
    { variables: { include_inactive: true }, fetchPolicy: 'cache-and-network' }
  );

  const [createMut, createState] = useMutation(CREATE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });
  const [updateMut, updateState] = useMutation(UPDATE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });
  const [deleteMut, deleteState] = useMutation(DELETE_CRM_DYNAMIC_FIELD, { refetchQueries: refetchAfter });
  const [reorderMut, reorderState] = useMutation(REORDER_CRM_DYNAMIC_FIELDS, { refetchQueries: refetchAfter });

  const [draft, setDraft] = useState<DraftState | null>(null);
  const [removing, setRemoving] = useState<CrmDynamicField | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(
    () => (data?.crmDynamicFields ?? []).slice().sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label)),
    [data]
  );

  const busy = createState.loading || updateState.loading || deleteState.loading || reorderState.loading;

  const save = async () => {
    if (!draft) return;
    const sortOrder = draft.id ? rows.find((r) => r.id === draft.id)?.sort_order ?? 0 : rows.length;
    const result = buildDynamicFieldInput(draft, sortOrder);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    try {
      if (draft.id) await updateMut({ variables: { id: draft.id, input: result.input } });
      else await createMut({ variables: { input: result.input } });
      setDraft(null);
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const toggleActive = async (row: CrmDynamicField) => {
    const result = buildDynamicFieldInput({ ...draftFromRow(row), is_active: !row.is_active }, row.sort_order);
    if (!result.ok) return;
    try {
      await updateMut({ variables: { id: row.id, input: result.input } });
    } catch (e) {
      setFormError(parseApiError(e));
    }
  };

  const reorder = async (ids: string[]) => {
    try {
      await reorderMut({ variables: { ids } });
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
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <TuneIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Dynamic Fields
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Define custom fields shown on venue & host forms. Drag rows to reorder — order is saved
            automatically.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setDraft({ ...blankDraft });
            setFormError(null);
          }}
          disabled={busy || !!draft}
        >
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
        <DynamicFieldForm
          draft={draft}
          busy={busy}
          onChange={setDraft}
          onCancel={() => {
            setDraft(null);
            setFormError(null);
          }}
          onSave={save}
        />
      )}

      <Card>
        <CardContent sx={{ p: 0 }}>
          {loading && rows.length === 0 ? (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          ) : (
            <DynamicFieldsTable
              rows={rows}
              busy={busy}
              draftOpen={!!draft}
              onEdit={(row) => {
                setDraft(draftFromRow(row));
                setFormError(null);
              }}
              onDelete={setRemoving}
              onToggleActive={toggleActive}
              onReorder={reorder}
            />
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
        destructive
        busyLabel="Working…"
        loading={deleteState.loading}
        onConfirm={confirmDelete}
        onClose={() => setRemoving(null)}
      />
    </Stack>
  );
}
