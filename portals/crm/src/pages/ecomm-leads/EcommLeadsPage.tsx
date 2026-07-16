import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { DELETE_ECOMM_LEAD, ECOMM_LEADS_TABLE } from '../../api/crm.gql';
import type { EcommLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import { ConfirmDialog } from '@duncit/dialogs';
import { CrmLeadsTable } from '../../components/lead-table';
import { parseApiError } from '@duncit/utils';

export default function EcommLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const refetchRef = useRef<(() => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<EcommLead | null>(null);

  const [deleteLead, { loading: deleting }] = useMutation(DELETE_ECOMM_LEAD);

  const fetchRows = useApolloTableFetch<EcommLead>(client, ECOMM_LEADS_TABLE, 'ecommLeadsTable');

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
      refetchRef.current?.();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Ecomm Leads"
        subtitle="Capture and qualify product sellers from the app onboarding gate and manual entry."
        onManageServices={() => navigate('/ecomm-leads/services')}
        manageServicesLabel="Manage Ecomm Services"
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <CrmLeadsTable<EcommLead>
        entity="ecomm"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        superCategoryOptions={superCategoryOptions}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/ecomm-leads/new')}>
            New Ecomm Lead
          </Button>
        }
        onView={(lead) => navigate(`/ecomm-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/ecomm-leads/${lead.id}`)}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete ecomm lead"
        message={`Delete "${toDelete?.seller_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
