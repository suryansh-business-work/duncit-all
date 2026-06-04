import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
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

const EMPTY: ServiceOfferedDraft = { super_category_id: '', category_id: '', sub_category_id: '', titles: [] };

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
  const [createMut, { loading: creating }] = useMutation(CREATE_CRM_SERVICES_OFFERED);
  const [deleteMut, { loading: deleting }] = useMutation(DELETE_CRM_SERVICE_OFFERED);

  const services = data?.crmServicesOffered ?? [];

  const submit = async () => {
    setFormError(null);
    if (!draft.super_category_id || draft.titles.length === 0) {
      setFormError('Pick a super category and add at least one title.');
      return;
    }
    try {
      await createMut({
        variables: {
          input: {
            super_category_id: draft.super_category_id,
            category_id: draft.category_id || null,
            sub_category_id: draft.sub_category_id || null,
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
            <Typography variant="h5" fontWeight={800}>Services Offered</Typography>
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
          {loading && !services.length ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
          ) : services.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No services yet. Click "Add Service Offered" to create your first one.
            </Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((s) => (
                  <TableRow key={s.id} hover>
                    <TableCell><Typography variant="body2" fontWeight={700}>{s.title}</Typography></TableCell>
                    <TableCell><Chip size="small" color={s.is_active ? 'success' : 'default'} label={s.is_active ? 'Active' : 'Inactive'} /></TableCell>
                    <TableCell align="right">
                      <Tooltip title="Delete">
                        <IconButton size="small" color="error" onClick={() => setToDelete(s)} aria-label={`Delete ${s.title}`}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
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
          <Button variant="contained" onClick={submit} disabled={creating || !draft.super_category_id || draft.titles.length === 0}>
            {creating ? 'Adding…' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

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
