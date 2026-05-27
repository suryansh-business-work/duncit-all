import { useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Snackbar, Stack } from '@mui/material';
import { DELETE_HOST_LEAD, HOST_LEADS } from '../../api/crm.gql';
import { CRM_EXCEL_EXPORT, CRM_EXCEL_TEMPLATE, downloadBase64Xlsx } from '../../api/excel.gql';
import type { HostLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import VobizContactDialog from '../../components/VobizContactDialog';
import FillWithAiDialog from '../../components/FillWithAiDialog';
import ExcelImportDialog from '../../components/ExcelImportDialog';
import HostLeadsTable from './HostLeadsTable';
import { parseApiError } from '../../utils/parseApiError';

export default function HostLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [superCategoryFilter, setSuperCategoryFilter] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<HostLead | null>(null);
  const [vobiz, setVobiz] = useState<{ mode: 'email' | 'call'; lead: HostLead } | null>(null);

  const { data, loading, refetch } = useQuery<{ hostLeads: HostLead[] }>(HOST_LEADS, {
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
  const [deleteLead, { loading: deleting }] = useMutation(DELETE_HOST_LEAD);

  const leads = data?.hostLeads ?? [];

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
      await refetch();
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
      setToast(kind === 'template' ? 'Template downloaded' : `Exported ${leads.length} host lead${leads.length === 1 ? '' : 's'}`);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const vobizLead = vobiz
    ? {
        id: vobiz.lead.id,
        display_name: vobiz.lead.host_name,
        primary_email: vobiz.lead.contacts?.[0]?.email,
        primary_mobile: vobiz.lead.contacts?.[0]?.mobile_number,
      }
    : null;

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Host Leads"
        subtitle="Capture and qualify host and organizer leads."
        search={search}
        onSearch={setSearch}
        onCreate={() => navigate('/host-leads/new')}
        createLabel="New Host Lead"
        superCategory={{
          selected: superCategoryFilter,
          options: superCategoryOptions,
          onChange: setSuperCategoryFilter,
        }}
        status={{ selected: statusFilter, options: statusOptions, onChange: setStatusFilter }}
        priority={{ selected: priorityFilter, options: priorityOptions, onChange: setPriorityFilter }}
        onFillWithAi={() => setShowAi(true)}
        onImport={() => setShowImport(true)}
        onExport={() => fetchExcel('export')}
        onDownloadTemplate={() => fetchExcel('template')}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <HostLeadsTable
        leads={leads}
        loading={loading && !data}
        onView={(lead) => navigate(`/host-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/host-leads/${lead.id}`)}
        onEmail={(lead) => setVobiz({ mode: 'email', lead })}
        onCall={(lead) => setVobiz({ mode: 'call', lead })}
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

      <VobizContactDialog
        open={!!vobiz}
        mode={vobiz?.mode ?? 'email'}
        entity="HOST_LEAD"
        lead={vobizLead}
        onClose={() => setVobiz(null)}
        onResult={(message) => setToast(message)}
      />

      <FillWithAiDialog
        open={showAi}
        entity="HOST_LEAD"
        title="Fill host lead with AI"
        onClose={() => setShowAi(false)}
        onApply={(parsed) => {
          setShowAi(false);
          navigate('/host-leads/new', { state: { aiPrefill: parsed } });
        }}
      />

      <ExcelImportDialog
        open={showImport}
        entity="HOST_LEAD"
        title="Import host leads from Excel"
        onClose={() => setShowImport(false)}
        onImported={(result) => {
          setToast(`Imported ${result.inserted} of ${result.inserted + result.failed} rows`);
          refetch();
        }}
        onDownloadTemplate={() => fetchExcel('template')}
      />

      <Snackbar open={!!toast} autoHideDuration={4000} onClose={() => setToast(null)} message={toast ?? ''} />
    </Stack>
  );
}
