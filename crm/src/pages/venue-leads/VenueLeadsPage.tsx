import { useMemo, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Snackbar, Stack } from '@mui/material';
import { DELETE_VENUE_LEAD, VENUE_LEADS } from '../../api/crm.gql';
import { CRM_EXCEL_EXPORT, CRM_EXCEL_TEMPLATE, downloadBase64Xlsx } from '../../api/excel.gql';
import type { VenueLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import ConfirmDialog from '../../components/ConfirmDialog';
import FillWithAiDialog from '../../components/FillWithAiDialog';
import ExcelImportDialog from '../../components/ExcelImportDialog';
import VenueLeadsTable from './VenueLeadsTable';
import { parseApiError } from '../../utils/parseApiError';

export default function VenueLeadsPage() {
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
  const [toDelete, setToDelete] = useState<VenueLead | null>(null);

  const { data, loading, refetch } = useQuery<{ venueLeads: VenueLead[] }>(VENUE_LEADS, {
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
  const [deleteLead, { loading: deleting }] = useMutation(DELETE_VENUE_LEAD);

  const leads = data?.venueLeads ?? [];

  const statusOptions = useMemo(
    () => (config.venue_lead_statuses ?? []).map((value) => ({ label: value, value })),
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
      setToast('Venue lead deleted');
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
        variables: { entity: 'VENUE_LEAD' },
        fetchPolicy: 'network-only',
      });
      const payload = kind === 'template' ? res.data.crmExcelTemplate : res.data.crmExcelExport;
      if (!payload) throw new Error('Empty response');
      downloadBase64Xlsx(payload.filename, payload.content_base64);
      setToast(kind === 'template' ? 'Template downloaded' : `Exported ${leads.length} venue lead${leads.length === 1 ? '' : 's'}`);
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Venue Leads"
        subtitle="Capture and track venue partnership leads."
        search={search}
        onSearch={setSearch}
        onCreate={() => navigate('/venue-leads/new')}
        createLabel="New Venue Lead"
        onManageServices={() => navigate('/venue-leads/services')}
        manageServicesLabel="Manage Venue Services"
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

      <VenueLeadsTable
        leads={leads}
        loading={loading && !data}
        onView={(lead) => navigate(`/venue-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/venue-leads/${lead.id}`)}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete venue lead"
        message={`Delete "${toDelete?.venue_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <FillWithAiDialog
        open={showAi}
        entity="VENUE_LEAD"
        title="Fill venue lead with AI"
        onClose={() => setShowAi(false)}
        onApply={(parsed) => {
          setShowAi(false);
          navigate('/venue-leads/new', { state: { aiPrefill: parsed } });
        }}
      />

      <ExcelImportDialog
        open={showImport}
        entity="VENUE_LEAD"
        title="Import venue leads from Excel"
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
