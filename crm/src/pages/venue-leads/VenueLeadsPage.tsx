import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, CircularProgress, Snackbar, Stack } from '@mui/material';
import { DELETE_VENUE_LEAD, VENUE_LEADS } from '../../api/crm.gql';
import type { VenueLead } from '../../api/crm.types';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import VenueLeadsTable from './VenueLeadsTable';
import VobizContactDialog from './VobizContactDialog';
import { parseApiError } from '../../utils/parseApiError';

export default function VenueLeadsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const { data, loading, error, refetch } = useQuery(VENUE_LEADS, {
    variables: { filter: { search } },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteLead, { loading: deleting }] = useMutation(DELETE_VENUE_LEAD);
  const [toDelete, setToDelete] = useState<VenueLead | null>(null);
  const [vobiz, setVobiz] = useState<{ mode: 'email' | 'call'; lead: VenueLead } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const leads = (data?.venueLeads ?? []) as VenueLead[];

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLead({ variables: { id: toDelete.id } });
      setToast('Venue lead deleted');
      setToDelete(null);
      await refetch();
    } catch (err) {
      setToast(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2}>
      <LeadsToolbar
        title="Venue Leads"
        subtitle="Capture and track venue partnership leads."
        search={search}
        onSearch={setSearch}
        onCreate={() => navigate('/venue-leads/new')}
        createLabel="New Venue Lead"
      />
      {error ? (
        <Alert severity="error">{parseApiError(error)}</Alert>
      ) : loading && !data ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <VenueLeadsTable
          leads={leads}
          onEdit={(lead) => navigate(`/venue-leads/${lead.id}`)}
          onEmail={(lead) => setVobiz({ mode: 'email', lead })}
          onCall={(lead) => setVobiz({ mode: 'call', lead })}
          onDelete={setToDelete}
        />
      )}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete venue lead"
        message={`Delete "${toDelete?.venue_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <VobizContactDialog
        open={!!vobiz}
        mode={vobiz?.mode ?? 'email'}
        lead={vobiz?.lead ?? null}
        onClose={() => setVobiz(null)}
        onResult={(message) => setToast(message)}
      />
      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
