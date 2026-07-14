import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { tableQueryToGql, type TableQueryState } from '@duncit/table';
import { DELETE_HOST_LEAD, HOST_LEADS_TABLE } from '../../api/crm.gql';
import { CRM_EXCEL_EXPORT, CRM_EXCEL_TEMPLATE, downloadBase64Xlsx } from '../../api/excel.gql';
import type { HostLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import FillWithAiDialog from '../../components/FillWithAiDialog';
import ExcelImportDialog from '../../components/ExcelImportDialog';
import { CrmLeadsTable } from '../../components/lead-table';
import { parseApiError } from '../../utils/parseApiError';

export default function HostLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const refetchRef = useRef<(() => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<HostLead | null>(null);

  const [deleteLead, { loading: deleting }] = useMutation(DELETE_HOST_LEAD);

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: HOST_LEADS_TABLE,
        variables: tableQueryToGql(q),
        fetchPolicy: 'network-only',
      });
      return { rows: data.hostLeadsTable.rows as HostLead[], total: data.hostLeadsTable.total as number };
    },
    [client],
  );

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
      setToast('Host lead deleted');
      setToDelete(null);
      refetchRef.current?.();
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const fetchExcel = async (kind: 'template' | 'export') => {
    try {
      const query = kind === 'template' ? CRM_EXCEL_TEMPLATE : CRM_EXCEL_EXPORT;
      const res = await client.query<{ crmExcelTemplate?: { filename: string; content_base64: string }; crmExcelExport?: { filename: string; content_base64: string } }>({
        query,
        variables: { entity: 'HOST_LEAD' },
        fetchPolicy: 'network-only',
      });
      const payload = kind === 'template' ? res.data.crmExcelTemplate : res.data.crmExcelExport;
      if (!payload) throw new Error('Empty response');
      downloadBase64Xlsx(payload.filename, payload.content_base64);
      setToast(kind === 'template' ? 'Template downloaded' : 'Host leads exported');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Host Leads"
        subtitle="Capture and qualify host and organizer leads."
        onManageServices={() => navigate('/host-leads/services')}
        manageServicesLabel="Manage Host Services"
        onFillWithAi={() => setShowAi(true)}
        onImport={() => setShowImport(true)}
        onExport={() => fetchExcel('export')}
        onDownloadTemplate={() => fetchExcel('template')}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <CrmLeadsTable<HostLead>
        entity="host"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        superCategoryOptions={superCategoryOptions}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/host-leads/new')}>
            New Host Lead
          </Button>
        }
        onView={(lead) => navigate(`/host-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/host-leads/${lead.id}`)}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete host lead"
        message={`Delete "${toDelete?.host_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <FillWithAiDialog
        open={showAi}
        entity="HOST_LEAD"
        title="Fill host leads with AI"
        onClose={() => setShowAi(false)}
        onSaved={(count) => {
          setToast(`Created ${count} host lead${count === 1 ? '' : 's'}`);
          refetchRef.current?.();
        }}
      />

      <ExcelImportDialog
        open={showImport}
        entity="HOST_LEAD"
        title="Import host leads from Excel"
        onClose={() => setShowImport(false)}
        onImported={(result) => {
          setToast(`Imported ${result.inserted} of ${result.inserted + result.failed} rows`);
          refetchRef.current?.();
        }}
        onDownloadTemplate={() => fetchExcel('template')}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
