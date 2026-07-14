import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandymanIcon from '@mui/icons-material/Handyman';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import {
  CRM_SERVICES_OFFERED_TABLE,
  CREATE_CRM_SERVICES_OFFERED,
  DELETE_CRM_SERVICE_OFFERED,
  type CrmServiceOfferedRow,
} from '../../../api/data.gql';
import { parseApiError } from '../../../utils/parseApiError';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ServiceOfferedForm, { type ServiceOfferedDraft } from './ServiceOfferedForm';
import ServicesOfferedTable from './ServicesOfferedTable';
import EditServiceOfferedDialog from './EditServiceOfferedDialog';

const EMPTY: ServiceOfferedDraft = {
  super_category_id: '', category_id: '', sub_category_id: '', applies_to_venue: true, applies_to_host: true, titles: [],
};

/** CRM → Data → Services Offered. Curate service titles under the Super → Category → Sub taxonomy. */
export default function ServicesOfferedPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceOfferedDraft>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CrmServiceOfferedRow | null>(null);
  const [toEdit, setToEdit] = useState<CrmServiceOfferedRow | null>(null);
  const [createMut, { loading: creating }] = useMutation(CREATE_CRM_SERVICES_OFFERED);
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_SERVICE_OFFERED);

  const targetValid = draft.applies_to_venue || draft.applies_to_host;

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: CRM_SERVICES_OFFERED_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return {
        rows: data.crmServicesOfferedTable.rows as CrmServiceOfferedRow[],
        total: data.crmServicesOfferedTable.total as number,
      };
    },
    [client],
  );

  const submit = async () => {
    setFormError(null);
    if (!draft.super_category_id || draft.titles.length === 0) {
      setFormError('Pick a super category and add at least one title.');
      return;
    }
    if (!targetValid) {
      setFormError('Pick at least one of Venue or Host.');
      return;
    }
    try {
      await createMut({
        variables: {
          input: {
            super_category_id: draft.super_category_id,
            category_id: draft.category_id || null,
            sub_category_id: draft.sub_category_id || null,
            applies_to_venue: draft.applies_to_venue,
            applies_to_host: draft.applies_to_host,
            titles: draft.titles,
          },
        },
      });
      setOpen(false);
      setDraft(EMPTY);
      refetchRef.current?.();
    } catch (err) {
      setFormError(parseApiError(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMut({ variables: { id: toDelete.id } });
    setToDelete(null);
    refetchRef.current?.();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <HandymanIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={800}>Services Offered (for Host &amp; Venue both)</Typography>
          <Typography variant="body2" color="text.secondary">
            Curated service titles per Super → Category → Sub. Venue & host forms load these dynamically.
          </Typography>
        </Box>
      </Stack>

      <ServicesOfferedTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <Button size="small" startIcon={<AddIcon />} variant="contained" onClick={() => { setDraft(EMPTY); setFormError(null); setOpen(true); }}>
            Add Service Offered
          </Button>
        }
        onEdit={setToEdit}
        onDelete={setToDelete}
      />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Service Offered</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 1.5 }}>{formError}</Alert>}
          <ServiceOfferedForm value={draft} onChange={setDraft} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={creating || !draft.super_category_id || draft.titles.length === 0 || !targetValid}>
            {creating ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <EditServiceOfferedDialog
        service={toEdit}
        onClose={() => setToEdit(null)}
        onSaved={() => refetchRef.current?.()}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete service"
        message={`Delete "${toDelete?.title ?? ''}"?`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </Stack>
  );
}
