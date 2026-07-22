import { useCallback, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Snackbar, Stack, Typography } from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import type { TableQueryState } from '@duncit/table';
import { WA_EXPORT_USER_LEADS, WA_IMPORT_USER_LEADS, WA_USER_LEADS } from '../tools/whatsapp/whatsappQueries';
import CreateLeadDialog from './CreateLeadDialog';
import EditLeadDialog from './EditLeadDialog';
import DeleteLeadsDialog from './DeleteLeadsDialog';
import LeadStatsBar from './LeadStatsBar';
import LeadsTable, { type LeadRow } from './LeadsTable';
import CleanDataButton from './CleanDataButton';
import { downloadBase64File, fileToBase64 } from '@duncit/utils';
import { logs } from '@duncit/logs';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** WhatsApp Leads — dashboard + server-side searchable/sortable/paginated table. */
export default function UserLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const refetchRef = useRef<(() => void) | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRow | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const [importLeads, importState] = useMutation(WA_IMPORT_USER_LEADS);

  const bumpAll = () => {
    refetchRef.current?.();
    setReloadKey((k) => k + 1);
  };

  const fetchRows = useCallback(
    async (q: TableQueryState) => {
      const { data } = await client.query({
        query: WA_USER_LEADS,
        variables: {
          input: { search: q.search || null, page: q.page, page_size: q.pageSize, sort_by: q.sortBy, sort_dir: q.sortDir },
        },
        fetchPolicy: 'network-only',
      });
      const page = data?.waUserLeads;
      return { rows: (page?.items ?? []) as LeadRow[], total: (page?.total ?? 0) as number };
    },
    [client],
  );

  const onImport = async (file: File) => {
    const file_base64 = await fileToBase64(file);
    const res = await importLeads({ variables: { file_base64 } });
    const r = res.data?.waImportUserLeads;
    setToast(`Imported ${r?.imported ?? 0} new · ${r?.duplicates ?? 0} duplicates · ${r?.skipped ?? 0} invalid skipped.`);
    bumpAll();
  };

  // The table's search box is internal to DuncitTable now, so the xlsx export always covers all leads.
  const onExport = async () => {
    const res = await client.query({
      query: WA_EXPORT_USER_LEADS,
      variables: { search: null },
      fetchPolicy: 'network-only',
    });
    if (res.data?.waExportUserLeads) {
      downloadBase64File(res.data.waExportUserLeads, 'whatsapp-leads.xlsx', XLSX_MIME);
    }
  };

  const onDeleted = (count: number) => {
    setToast(`Deleted ${count} lead${count === 1 ? '' : 's'}.`);
    bumpAll();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 2 }}>
        <PersonSearchIcon color="primary" />
        <Typography variant="h5" fontWeight={800}>WhatsApp Leads</Typography>
      </Stack>

      <LeadStatsBar reloadKey={reloadKey} />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f).catch((error) => logs.portal['crm'].error('user-leads', 'onImport', { error, msg: 'Failed to import user leads' }));
          e.target.value = '';
        }}
      />

      <LeadsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        toolbarActions={
          <>
            <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New</Button>
            <Button size="small" startIcon={<UploadFileIcon />} disabled={importState.loading} onClick={() => fileRef.current?.click()}>Import</Button>
            <Button size="small" startIcon={<DownloadIcon />} onClick={onExport}>Export</Button>
            <CleanDataButton onCleaned={bumpAll} />
          </>
        }
        onRowClick={(id) => navigate(`/user-leads/${id}`)}
        onEdit={setEditLead}
        onDelete={(lead) => setDeleteIds([lead.id])}
      />

      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={bumpAll} />
      <EditLeadDialog lead={editLead} onClose={() => setEditLead(null)} onSaved={bumpAll} />
      <DeleteLeadsDialog ids={deleteIds} onClose={() => setDeleteIds([])} onDeleted={onDeleted} />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
