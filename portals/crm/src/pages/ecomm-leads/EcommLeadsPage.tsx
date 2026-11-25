import { useMemo, useRef, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router';
import { Alert, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitButton } from '@duncit/buttons';
import { DELETE_ECOMM_LEAD, ECOMM_LEADS_TABLE } from '../../api/crm.gql';
import type { EcommLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import { ConfirmDialog } from '@duncit/dialogs';
import { CrmLeadsTable } from '../../components/lead-table';
import { useLeadsTableFetch } from '../../hooks/useNearbyLeads';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { useLeadEditorOrigin } from '../../hooks/useLeadEditorFlow';

export default function EcommLeadsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const editorOrigin = useLeadEditorOrigin();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const refetchRef = useRef<(() => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<EcommLead | null>(null);

  const [deleteLead, { loading: deleting }] = useMutation<any>(DELETE_ECOMM_LEAD);

  const { fetchRows, nearby } = useLeadsTableFetch<EcommLead>(ECOMM_LEADS_TABLE, 'ecommLeadsTable');

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
      setToast(t('crm.ecommLeads.ecommLeadDeleted'));
      setToDelete(null);
      refetchRef.current?.();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title={t('shell.nav.ecommLeads')}
        subtitle={t('crm.ecommLeads.captureAndQualifyProductSellersFrom')}
        onManageServices={() => navigate('/data/services-offered')}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <CrmLeadsTable<EcommLead>
        entity="ecomm"
        fetchRows={fetchRows}
        nearby={nearby}
        refetchRef={refetchRef}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        superCategoryOptions={superCategoryOptions}
        toolbarActions={
          <DuncitButton size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/ecomm-leads/new', { state: editorOrigin })}>
            {t('crm.ecommLeads.newLead')}
          </DuncitButton>
        }
        onView={(lead) => navigate(`/ecomm-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/ecomm-leads/${lead.id}`, { state: editorOrigin })}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title={t('crm.ecommLeads.deleteEcommLead')}
        message={t('crm.ecommLeads.deleteMessage', { vars: { name: toDelete?.seller_name ?? '' } })}
        confirmLabel={t('shell.common.delete')}
        destructive
        busyLabel={t('crm.common.working')}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
