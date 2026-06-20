import { useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  InputAdornment,
  Paper,
  Snackbar,
  Stack,
  TablePagination,
  TextField,
  Typography,
} from '@mui/material';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { WA_EXPORT_USER_LEADS, WA_IMPORT_USER_LEADS, WA_USER_LEADS } from '../tools/whatsapp/whatsappQueries';
import CreateLeadDialog from './CreateLeadDialog';
import EditLeadDialog from './EditLeadDialog';
import DeleteLeadsDialog from './DeleteLeadsDialog';
import LeadStatsBar from './LeadStatsBar';
import LeadsTable, { type LeadRow } from './LeadsTable';
import CleanDataButton from './CleanDataButton';
import { useLeadSelection } from './useLeadSelection';
import { fileToBase64, downloadBase64Xlsx } from './leadFiles';

/** WhatsApp Leads — dashboard + server-side searchable/sortable/paginated table. */
export default function UserLeadsPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [sortBy, setSortBy] = useState('imported_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [editLead, setEditLead] = useState<LeadRow | null>(null);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  // Debounce the search box → server query.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, loading, error, refetch } = useQuery(WA_USER_LEADS, {
    variables: { input: { search: search || null, page: page + 1, page_size: pageSize, sort_by: sortBy, sort_dir: sortDir } },
    fetchPolicy: 'cache-and-network',
  });
  const [importLeads, importState] = useMutation(WA_IMPORT_USER_LEADS);

  const bumpAll = () => {
    void refetch();
    setReloadKey((k) => k + 1);
  };

  const leads: LeadRow[] = data?.waUserLeads?.items ?? [];
  const total = data?.waUserLeads?.total ?? 0;
  const { selected, toggleOne, toggleAll, clear } = useLeadSelection(leads);

  const onSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const onImport = async (file: File) => {
    const file_base64 = await fileToBase64(file);
    const res = await importLeads({ variables: { file_base64 } });
    const r = res.data?.waImportUserLeads;
    setToast(`Imported ${r?.imported ?? 0} new · ${r?.duplicates ?? 0} duplicates · ${r?.skipped ?? 0} invalid skipped.`);
    bumpAll();
  };

  const onExport = async () => {
    const res = await client.query({
      query: WA_EXPORT_USER_LEADS,
      variables: { search: search || null },
      fetchPolicy: 'network-only',
    });
    if (res.data?.waExportUserLeads) {
      downloadBase64Xlsx(res.data.waExportUserLeads, 'whatsapp-leads.xlsx');
    }
  };

  const onDeleted = (count: number) => {
    setToast(`Deleted ${count} lead${count === 1 ? '' : 's'}.`);
    clear();
    bumpAll();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <PersonSearchIcon color="primary" />
          <Typography variant="h5" fontWeight={800}>WhatsApp Leads</Typography>
        </Stack>
        <Stack direction="row" spacing={1} flexWrap="wrap">
          {selected.size > 0 && (
            <Button size="small" color="error" variant="contained" startIcon={<DeleteIcon />} onClick={() => setDeleteIds([...selected])}>
              Delete ({selected.size})
            </Button>
          )}
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>New</Button>
          <Button size="small" startIcon={<UploadFileIcon />} disabled={importState.loading} onClick={() => fileRef.current?.click()}>Import</Button>
          <Button size="small" startIcon={<DownloadIcon />} onClick={onExport}>Export</Button>
          <CleanDataButton onCleaned={bumpAll} />
        </Stack>
      </Stack>

      <LeadStatsBar reloadKey={reloadKey} />

      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />

      <TextField
        size="small"
        fullWidth
        placeholder="Search by name or phone…"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
      />

      {error && <Alert severity="error" sx={{ mb: 1 }}>{error.message}</Alert>}
      {loading && leads.length === 0 ? (
        <Stack alignItems="center" sx={{ py: 6 }}><CircularProgress /></Stack>
      ) : total === 0 ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No WhatsApp leads yet. Add one with “New”, or “Import” an Excel/CSV.
        </Alert>
      ) : (
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <LeadsTable
            rows={leads}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={onSort}
            onRowClick={(id) => navigate(`/user-leads/${id}`)}
            selected={selected}
            onToggle={toggleOne}
            onToggleAll={toggleAll}
            onEdit={setEditLead}
            onDelete={(lead) => setDeleteIds([lead.id])}
          />
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_e, p) => setPage(p)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(e) => {
              setPageSize(Number.parseInt(e.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </Paper>
      )}

      <CreateLeadDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={bumpAll} />
      <EditLeadDialog lead={editLead} onClose={() => setEditLead(null)} onSaved={bumpAll} />
      <DeleteLeadsDialog ids={deleteIds} onClose={() => setDeleteIds([])} onDeleted={onDeleted} />
      <Snackbar open={!!toast} autoHideDuration={5000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
