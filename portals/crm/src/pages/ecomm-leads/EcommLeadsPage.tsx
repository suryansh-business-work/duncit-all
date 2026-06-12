import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Snackbar, Stack, Typography } from '@mui/material';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { DELETE_ECOMM_LEAD, ECOMM_LEADS } from '../../api/crm.gql';
import type { EcommLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import EcommLeadsTable from './EcommLeadsTable';
import { parseApiError } from '../../utils/parseApiError';

export default function EcommLeadsPage() {
  const navigate = useNavigate();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [superCategoryFilter, setSuperCategoryFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<EcommLead | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { data, loading, refetch } = useQuery<{ ecommLeads: EcommLead[] }>(ECOMM_LEADS, {
    variables: {
      filter: {
        search,
        lead_status: statusFilter || null,
        priority: priorityFilter || null,
        super_category_id: superCategoryFilter || null,
      },
    },
    fetchPolicy: 'cache-and-network',
  });
  const [deleteLead, { loading: deleting }] = useMutation(DELETE_ECOMM_LEAD);

  const leads = data?.ecommLeads ?? [];

  const statusOptions = useMemo(
    () => (config.host_lead_statuses ?? []).map((value) => ({ label: value, value })),
    [config]
  );
  const priorityOptions = useMemo(
    () => (config.priorities ?? []).map((value) => ({ label: value, value })),
    [config]
  );
  const superCategoryOptions = useMemo(
    () => superCategories.map((c) => ({ label: c.name, value: c.id })),
    [superCategories]
  );

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteLead({ variables: { id: toDelete.id } });
      setToast('Ecomm lead deleted');
      setToDelete(null);
      await refetch();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const bulkDelete = async () => {
    setBulkBusy(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteLead({ variables: { id } })));
      setToast(`Deleted ${selectedIds.length} ecomm lead${selectedIds.length === 1 ? '' : 's'}`);
      setSelectedIds([]);
      setBulkOpen(false);
      await refetch();
    } catch (err) {
      setError(parseApiError(err));
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Ecomm Leads"
        subtitle="Capture and qualify product sellers from the app onboarding gate and manual entry."
        search={search}
        onSearch={setSearch}
        onCreate={() => navigate('/ecomm-leads/new')}
        createLabel="New Ecomm Lead"
        onManageServices={() => navigate('/ecomm-leads/services')}
        manageServicesLabel="Manage Ecomm Services"
        superCategory={{
          selected: superCategoryFilter,
          options: superCategoryOptions,
          onChange: setSuperCategoryFilter,
        }}
        status={{ selected: statusFilter, options: statusOptions, onChange: setStatusFilter }}
        priority={{ selected: priorityFilter, options: priorityOptions, onChange: setPriorityFilter }}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      {selectedIds.length > 0 && (
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ px: 1 }}>
          <Typography variant="body2" color="text.secondary">{selectedIds.length} selected</Typography>
          <Button size="small" color="error" variant="outlined" startIcon={<DeleteSweepIcon />} onClick={() => setBulkOpen(true)}>
            Delete selected
          </Button>
        </Stack>
      )}

      <EcommLeadsTable
        leads={leads}
        loading={loading && !data}
        onView={(lead) => navigate(`/ecomm-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/ecomm-leads/${lead.id}`)}
        onDelete={setToDelete}
        selectionModel={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete ecomm lead"
        message={`Delete "${toDelete?.seller_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={bulkOpen}
        title="Delete selected ecomm leads"
        message={`Delete ${selectedIds.length} selected ecomm lead${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete all"
        loading={bulkBusy}
        onConfirm={bulkDelete}
        onClose={() => setBulkOpen(false)}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
