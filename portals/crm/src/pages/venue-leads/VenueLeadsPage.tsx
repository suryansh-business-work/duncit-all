import { useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Alert, Button, Snackbar, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useApolloTableFetch } from '@duncit/table';
import { DELETE_VENUE_LEAD, VENUE_LEADS_TABLE } from '../../api/crm.gql';
import { CRM_EXCEL_EXPORT, CRM_EXCEL_TEMPLATE } from '../../api/excel.gql';
import type { VenueLead } from '../../api/crm.types';
import { useCrmConfig } from '../../api/useCrmConfig';
import { useSuperCategories } from '../../api/useSuperCategories';
import LeadsToolbar from '../../components/LeadsToolbar';
import { ConfirmDialog } from '@duncit/dialogs';
import FillWithAiDialog from '../../components/FillWithAiDialog';
import ExcelImportDialog from '../../components/ExcelImportDialog';
import { CrmLeadsTable } from '../../components/lead-table';
import { downloadBase64File, parseApiError } from '@duncit/utils';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export default function VenueLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { config } = useCrmConfig();
  const { options: superCategories } = useSuperCategories();
  const refetchRef = useRef<(() => void) | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [toDelete, setToDelete] = useState<VenueLead | null>(null);

  const [deleteLead, { loading: deleting }] = useMutation(DELETE_VENUE_LEAD);

  const fetchRows = useApolloTableFetch<VenueLead>(client, VENUE_LEADS_TABLE, 'venueLeadsTable');

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
        variables: { entity: 'VENUE_LEAD' },
        fetchPolicy: 'network-only',
      });
      const payload = kind === 'template' ? res.data.crmExcelTemplate : res.data.crmExcelExport;
      if (!payload) throw new Error('Empty response');
      downloadBase64File(payload.content_base64, payload.filename, XLSX_MIME);
      setToast(kind === 'template' ? 'Template downloaded' : 'Venue leads exported');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  return (
    <Stack spacing={2.5}>
      <LeadsToolbar
        title="Venue Leads"
        subtitle="Capture and track venue partnership leads."
        onManageServices={() => navigate('/venue-leads/services')}
        manageServicesLabel="Manage Venue Services"
        onFillWithAi={() => setShowAi(true)}
        onImport={() => setShowImport(true)}
        onExport={() => fetchExcel('export')}
        onDownloadTemplate={() => fetchExcel('template')}
      />

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}

      <CrmLeadsTable<VenueLead>
        entity="venue"
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        superCategoryOptions={superCategoryOptions}
        toolbarActions={
          <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/venue-leads/new')}>
            New Venue Lead
          </Button>
        }
        onView={(lead) => navigate(`/venue-leads/${lead.id}/view`)}
        onEdit={(lead) => navigate(`/venue-leads/${lead.id}`)}
        onDelete={setToDelete}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete venue lead"
        message={`Delete "${toDelete?.venue_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        busyLabel="Working…"
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <FillWithAiDialog
        open={showAi}
        entity="VENUE_LEAD"
        title="Fill venue leads with AI"
        onClose={() => setShowAi(false)}
        onSaved={(count) => {
          setToast(`Created ${count} venue lead${count === 1 ? '' : 's'}`);
          refetchRef.current?.();
        }}
      />

      <ExcelImportDialog
        open={showImport}
        entity="VENUE_LEAD"
        title="Import venue leads from Excel"
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
