import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Snackbar, Stack } from '@mui/material';
import { DELETE_HOST_LEAD, HOST_LEADS } from '../../api/crm.gql';
import type { HostLead } from '../../api/crm.types';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import HostLeadsTable from './HostLeadsTable';
import { parseApiError } from '../../utils/parseApiError';

export default function HostLeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(HOST_LEADS, {
    variables: { filter: { search } },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteLead, { loading: deleting }] = useMutation(DELETE_HOST_LEAD);
  const [toDelete, setToDelete] = useState<HostLead | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const leads = (data?.hostLeads ?? []) as HostLead[];

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLead({ variables: { id: toDelete.id } });
      setToast('Host lead deleted');
      setToDelete(null);
      await refetch();
    } catch (err) {
      setToast(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2}>
      <LeadsToolbar
        title="Host Leads"
        subtitle="Capture and qualify host and organizer leads."
        search={search}
        onSearch={setSearch}
        onCreate={() => navigate('/host-leads/new')}
        createLabel="New Host Lead"
      />
      {error ? (
        <Alert severity="error">{parseApiError(error)}</Alert>
      ) : loading && !data ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <HostLeadsTable leads={leads} onEdit={(lead) => navigate(`/host-leads/${lead.id}`)} onDelete={setToDelete} />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete host lead"
        message={`Delete "${toDelete?.host_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
