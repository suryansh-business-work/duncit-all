import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HandymanIcon from '@mui/icons-material/Handyman';
import {
  CRM_SERVICES_OFFERED,
  CREATE_CRM_SERVICES_OFFERED,
  DELETE_CRM_SERVICE_OFFERED,
  type CrmServiceOffered,
} from '../../../api/data.gql';
import { parseApiError } from '../../../utils/parseApiError';
import ConfirmDialog from '../../../components/ConfirmDialog';
import ServiceOfferedForm, { type ServiceOfferedDraft } from './ServiceOfferedForm';
import ServicesOfferedTable from './ServicesOfferedTable';
import EditServiceOfferedDialog from './EditServiceOfferedDialog';
import ServicesOfferedFilters, { EMPTY_FILTERS, filterServices, type ServicesFilterState } from './ServicesOfferedFilters';

const EMPTY: ServiceOfferedDraft = {
  super_category_id: '', category_id: '', sub_category_id: '', applies_to_venue: true, applies_to_host: true, titles: [],
};

/** CRM → Data → Services Offered. Curate service titles under the Super → Category → Sub taxonomy. */
export default function ServicesOfferedPage() {
  const { data, loading, error, refetch } = useQuery<{ crmServicesOffered: CrmServiceOffered[] }>(
    CRM_SERVICES_OFFERED,
    { fetchPolicy: 'cache-and-network' }
  );
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ServiceOfferedDraft>(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<CrmServiceOffered | null>(null);
  const [toEdit, setToEdit] = useState<CrmServiceOffered | null>(null);
  const [filters, setFilters] = useState<ServicesFilterState>(EMPTY_FILTERS);
  const [createMut, { loading: creating }] = useMutation(CREATE_CRM_SERVICES_OFFERED);
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_SERVICE_OFFERED);

  const services = data?.crmServicesOffered ?? [];
  const visible = useMemo(() => filterServices(services, filters), [services, filters]);
  const targetValid = draft.applies_to_venue || draft.applies_to_host;

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
      refetch();
    } catch (err) {
      setFormError(parseApiError(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    await deleteMut({ variables: { id: toDelete.id } });
    setToDelete(null);
    refetch();
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" useFlexGap>
        <Stack direction="row" alignItems="center" spacing={1}>
          <HandymanIcon color="primary" />
          <Box>
            <Typography variant="h5" fontWeight={800}>Services Offered (for Host &amp; Venue both)</Typography>
            <Typography variant="body2" color="text.secondary">
              Curated service titles per Super → Category → Sub. Venue & host forms load these dynamically.
            </Typography>
          </Box>
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained" onClick={() => { setDraft(EMPTY); setFormError(null); setOpen(true); }}>
          Add Service Offered
        </Button>
      </Stack>

      {error && <Alert severity="error">{parseApiError(error)}</Alert>}

      <Card>
        <CardContent>
          <Stack spacing={2}>
            {services.length > 0 && <ServicesOfferedFilters value={filters} onChange={setFilters} />}
            {loading && services.length === 0 && (
              <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
            )}
            {!loading && services.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No services yet. Click "Add Service Offered" to create your first one.
              </Typography>
            )}
            {services.length > 0 && visible.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No services match your search.
              </Typography>
            )}
            {services.length > 0 && visible.length > 0 && (
              <ServicesOfferedTable services={visible} onEdit={setToEdit} onDelete={setToDelete} />
            )}
          </Stack>
        </CardContent>
      </Card>

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

      <EditServiceOfferedDialog service={toEdit} onClose={() => setToEdit(null)} />

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
